import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PromptData } from "../types";
import { stripHtml, formatTextWithLineBreaks } from "../utils/textUtils";
import { imageUrlToBase64 } from "../utils/imageUtils";

// FIX: Initialize GoogleGenAI with a named apiKey parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Use recommended models for text and image generation.
const textModel = 'gemini-2.5-flash';
const imageGenerationModel = 'imagen-4.0-generate-001';
const imageEditModel = 'gemini-2.5-flash-image-preview';

const BLANK_WHITE_IMAGE_512 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAADMElEQVR42u3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+Bs2sAAGs5iJOAAAAAElFTkSuQmCC';


interface StoryPageResponse {
    text: string;
    image_prompt: string;
}

const storySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'Il testo della pagina. La prima pagina è il titolo della storia.',
      },
      image_prompt: {
        type: Type.STRING,
        description: 'Un prompt dettagliato per un generatore di immagini, descrivendo la scena per questa pagina. Dovrebbe essere in inglese.',
      },
    },
    required: ['text', 'image_prompt'],
  },
};

export const generateStoryPages = async (prompt: PromptData): Promise<StoryPageResponse[]> => {
  const systemInstruction = `Sei un autore di libri per bambini di livello mondiale. Scrivi una storia breve e coinvolgente basata sul prompt dell'utente.
La tua risposta DEVE essere un array JSON di oggetti pagina.
Ogni oggetto deve avere una chiave "text" e una chiave "image_prompt".
La prima pagina deve contenere solo il titolo della storia.
Le pagine successive dovrebbero contenere 1-3 frasi.
L'image_prompt deve essere una descrizione visiva dettagliata della scena in inglese, da utilizzare per la generazione di immagini.
Adatta il tono e il linguaggio alla fascia d'età target: ${prompt.targetAge}.
Stile del libro: ${prompt.bookStyle}.`;

  const userPrompt = `Temi: ${prompt.themes}. Elementi chiave: ${prompt.otherElements}. Crea una storia completa con un inizio, uno svolgimento e una fine. Includi circa 5-7 pagine in totale (1 titolo + 4-6 pagine di storia).`;

  try {
    // FIX: Use ai.models.generateContent for text generation with JSON output.
    const response = await ai.models.generateContent({
      model: textModel,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storySchema,
      },
    });

    // FIX: Access the text directly from the response object.
    const jsonText = response.text.trim();
    const storyPages: StoryPageResponse[] = JSON.parse(jsonText);
    
    if (!Array.isArray(storyPages) || storyPages.length === 0) {
        throw new Error("La risposta dell'IA non era nel formato previsto (array di pagine).");
    }

    return storyPages;
  } catch (error) {
    console.error("Errore durante la generazione del testo della storia:", error);
    throw new Error(`Impossibile generare il testo della storia. Dettagli: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const generateImageWithEditModel = async (prompt: string, baseImageUrl: string, referenceImages: {style: string | null, character: string | null}): Promise<string> => {
    const parts: any[] = [];
    let processedPrompt = prompt;

    // 1. Add base image (previous page or blank white)
    const { base64: baseImageBase64, mimeType: baseImageMimeType } = await imageUrlToBase64(baseImageUrl);
    parts.push({ inlineData: { data: baseImageBase64, mimeType: baseImageMimeType } });

    // 2. Add reference images if they exist
    const refPrompts = [];
    if (referenceImages.style) {
        const { base64, mimeType } = await imageUrlToBase64(referenceImages.style);
        parts.push({ inlineData: { data: base64, mimeType } });
        refPrompts.push("style reference");
    }
    if (referenceImages.character) {
        const { base64, mimeType } = await imageUrlToBase64(referenceImages.character);
        parts.push({ inlineData: { data: base64, mimeType } });
        refPrompts.push("character reference");
    }

    // 3. Construct a clear text prompt
    if (refPrompts.length > 0) {
        processedPrompt = `Using the provided images (${refPrompts.join(' and ')}) as a guide, illustrate this scene: ${prompt}`;
        if (baseImageUrl !== BLANK_WHITE_IMAGE_512) {
             processedPrompt = `Using the provided reference images and maintaining consistency with the previous illustration, create this new scene: ${prompt}`;
        }
    } else if (baseImageUrl !== BLANK_WHITE_IMAGE_512) {
        processedPrompt = `Following the style and characters of the provided image, illustrate this new scene: ${prompt}`;
    }
    
    parts.push({ text: processedPrompt });
    
    // 4. Call the API
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    // 5. Extract the result
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageMimeType = part.inlineData.mimeType;
            return `data:${imageMimeType};base64,${base64ImageBytes}`;
        }
    }
    throw new Error("Il modello di modifica non ha restituito un'immagine.");
}


export const generatePageImage = async (prompt: string, promptData: PromptData, previousPageImageUrl?: string | null): Promise<string> => {
  const { referenceImageUrls } = promptData;
  const hasReferenceImages = referenceImageUrls.style || referenceImageUrls.character;

  try {
    // Case 1: Editing a previous page. Always use the edit model for consistency.
    if (previousPageImageUrl) {
        return await generateImageWithEditModel(prompt, previousPageImageUrl, referenceImageUrls);
    } 
    // Case 2: Generating a cover with reference images. Force edit model on a blank canvas.
    else if (hasReferenceImages) {
        return await generateImageWithEditModel(prompt, BLANK_WHITE_IMAGE_512, referenceImageUrls);
    } 
    // Case 3: Generating a cover with NO reference images. Try the standard imagegen model first.
    else {
        try {
            const response = await ai.models.generateImages({
                model: imageGenerationModel,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '4:3',
                },
            });

            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("Nessuna immagine generata dall'API.");
            }
            
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } catch (generationError) {
             // Fallback: If imagegen fails, use the edit model on a blank canvas.
             console.warn("generateImages fallito, fallback su generateContent con immagine bianca:", generationError);
             return await generateImageWithEditModel(prompt, BLANK_WHITE_IMAGE_512, referenceImageUrls);
        }
    }
  } catch (error) {
    console.error("Errore durante la generazione dell'immagine:", error);
    throw new Error(`Impossibile generare l'immagine. Dettagli: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const regeneratePageText = async (
  promptData: PromptData,
  previousPageText: string | null,
  currentPageText: string,
  modificationPrompt: string
): Promise<string> => {
  const systemInstruction = `Sei un editor di libri per bambini di livello mondiale. Il tuo compito è riscrivere una singola pagina di una storia basandoti su un'istruzione specifica, mantenendo la coerenza con la pagina precedente e il tono generale.
Adatta il tono e il linguaggio alla fascia d'età target: ${promptData.targetAge}.
Stile del libro: ${promptData.bookStyle}.
La tua risposta DEVE contenere solo il nuovo testo per la pagina, senza alcuna formattazione o testo aggiuntivo come "Ecco la nuova versione:". Mantieni la lunghezza simile a quella originale (1-3 frasi).`;

  const userPrompt = `La storia parla di: "${promptData.themes}" con i seguenti elementi: "${promptData.otherElements}".
${previousPageText ? `Il testo della pagina precedente era: "${stripHtml(previousPageText)}".` : "Questa è la prima pagina (il titolo)."}
Il testo attuale della pagina che devi riscrivere è: "${stripHtml(currentPageText)}".

Applica la seguente istruzione di modifica: "${modificationPrompt || 'Fornisci una nuova versione creativa e fantasiosa di questo testo.'}"`;

  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: userPrompt,
      config: {
        systemInstruction,
      },
    });

    const newText = response.text.trim();
    if (!newText) {
      throw new Error("L'IA ha restituito una risposta vuota.");
    }
    return formatTextWithLineBreaks(newText);
  } catch (error) {
    console.error("Errore durante la rigenerazione del testo della pagina:", error);
    throw new Error(`Impossibile rigenerare il testo. Dettagli: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const translateText = async (text: string, targetLanguage: 'it' | 'en'): Promise<string> => {
  const languageMap = {
    it: 'italiano',
    en: 'inglese',
  };
  const systemInstruction = `Sei un traduttore esperto. Traduci il testo seguente in ${languageMap[targetLanguage]}. La tua risposta DEVE contenere solo il testo tradotto, senza spiegazioni, saluti o formattazioni aggiuntive.`;
  
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: text,
      config: {
        systemInstruction,
        // Disabling thinking for faster, more direct translations
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    const translatedText = response.text.trim();
    if (!translatedText) {
      throw new Error("La traduzione ha restituito una risposta vuota.");
    }
    return translatedText;
  } catch (error) {
    console.error(`Errore durante la traduzione in ${languageMap[targetLanguage]}:`, error);
    throw new Error(`Impossibile tradurre il testo. Dettagli: ${error instanceof Error ? error.message : String(error)}`);
  }
};