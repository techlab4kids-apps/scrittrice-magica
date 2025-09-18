import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PromptData } from "../types";
import { stripHtml, formatTextWithLineBreaks } from "../utils/textUtils";
import { imageUrlToBase64 } from "../utils/imageUtils";

// Initialize GoogleGenAI with a named apiKey parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Use recommended models for text and image generation.
const textModel = 'gemini-2.5-flash';
const imageEditModel = 'gemini-2.5-flash-image-preview';

// A simple, non-transparent 512x512 white JPEG to use as a base for the cover.
const BLANK_WHITE_IMAGE_512_JPG = 'data:image/jpeg;base64,/9j/4AAQSkJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAf/Z';

const mapBookStyleToPrompt = (style: 'toddler' | 'classic' | 'comic' | 'photo'): string => {
    switch (style) {
        case 'toddler':
            return 'Bright, vibrant colors and simple, bold shapes, in the style of a toddler board book.';
        case 'classic':
            return 'Classic fairytale, watercolor illustration style.';
        case 'comic':
            return 'Comic book style with bold lines and flat colors.';
        case 'photo':
            return 'A realistic, photographic style.';
        default:
            return 'A beautiful illustration.';
    }
};

/**
 * Generates the text content for a multi-page story based on user prompts.
 */
export const generateStoryPages = async (promptData: PromptData): Promise<{ text: string, image_prompt: string }[]> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                text: {
                    type: Type.STRING,
                    description: "The text for this page of the story. The first page is the title. It should be engaging for the target age.",
                },

                image_prompt: {
                    type: Type.STRING,
                    description: "A detailed, SFW, English-language prompt for an image generation model to create an illustration for this page's text. Describe the scene, characters, and actions. Example: 'A cute, smiling rabbit named Leo wearing a blue jacket, waving to a wise old owl sitting on a tree branch in a sunny forest.'"
                }
            },
            required: ["text", "image_prompt"]
        }
    };
    
    const systemInstruction = `You are an AI author for children's books. Your task is to write a short, complete story based on the user's requirements.
- The story should be suitable for the target age: ${promptData.targetAge}.
- The story must have a clear beginning, middle, and end.
- The first page you generate should be ONLY the title of the story.
- Generate about ${promptData.pageCount || '5-7'} pages in total (including the title page).
- For each page, provide the page text and a corresponding image prompt.
- The response MUST be a valid JSON array matching the provided schema. Do not include any text outside the JSON structure.`;

    const contents = `Please write a story based on these details:
- Themes: ${promptData.themes}
- Characters/Elements: ${promptData.otherElements}
- Don't use the same characters from famous franchises.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text;
        const pages = JSON.parse(jsonString);
        if (!Array.isArray(pages) || pages.length === 0) {
            throw new Error("L'IA non ha restituito una struttura di storia valida.");
        }
        return pages;
    } catch (error) {
        console.error("Error in generateStoryPages:", error);
        throw new Error("L'IA non è riuscita a generare la storia. Controlla il tuo prompt e riprova.");
    }
};

/**
 * An internal function that uses a separate AI call to analyze the user's image prompt.
 * If the analysis fails, it now throws a specific error instead of returning a value
 * that could corrupt downstream image generation prompts.
 */
const extractStyleAndCleanPrompt = async (originalPrompt: string, bookStyle: string): Promise<{ cleanedPrompt: string, extractedStyle: string | null }> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            cleaned_prompt: {
                type: Type.STRING,
                description: "The prompt with all stylistic instructions removed. It should only contain the scene description, characters, and actions. E.g., 'A brave teddy bear named Barnaby walking through an enchanted forest'."
            },
            extracted_style: {
                type: Type.STRING,
                description: "The stylistic instruction that was removed from the prompt. E.g., 'in a classic fairytale watercolor style'. If no specific style is found, return an empty string."
            }
        },
        required: ['cleaned_prompt', 'extracted_style']
    };

    const systemInstruction = `You are an AI assistant that analyzes image prompts. Your task is to separate the scene description from any stylistic instructions.
- Analyze the user's prompt provided in the contents.
- Return the prompt with ONLY the style instructions removed in 'cleaned_prompt'.
- Return ONLY the extracted style phrase in 'extracted_style'.
- If you don't find any specific style instructions in the user's prompt, you MUST return an empty string for 'extracted_style'.
- Your response MUST be a valid JSON object matching the schema. Do not include any other text, markdown formatting, or explanations.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `The prompt to analyze is: "${originalPrompt}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text;
        const result = JSON.parse(jsonString);

        if (typeof result.cleaned_prompt === 'string' && typeof result.extracted_style === 'string') {
            return {
                cleanedPrompt: result.cleaned_prompt.trim(),
                extractedStyle: result.extracted_style.trim() || null,
            };
        } else {
            console.warn("Style extraction returned an invalid object structure.", result);
            throw new Error("L'analisi del prompt ha restituito una struttura non valida.");
        }

    } catch (error) {
        console.error("AI call to clean the prompt failed:", error);
        throw new Error("Impossibile pulire il prompt per l'immagine. L'analisi AI è fallita.");
    }
};


/**
 * Generates a single page image based on a prompt and other context.
 */
export const generatePageImage = async (
  prompt: string,
  promptData: PromptData,
  previousImageUrl: string | null,
  referenceImageUrl?: string | null
): Promise<{ imageUrl: string }> => {
    if (!prompt) {
        throw new Error("Il prompt per l'immagine non può essere vuoto.");
    }

    const { cleanedPrompt, extractedStyle } = await extractStyleAndCleanPrompt(prompt, promptData.bookStyle);

    const definitiveStyle = extractedStyle || mapBookStyleToPrompt(promptData.bookStyle);
    
    const finalPrompt = `Create an image of: ${cleanedPrompt}. The style should be: ${definitiveStyle}.`;

    const parts: any[] = [];
    
    // BUG FIX: An explicit reference (from drag-drop or self-regeneration)
    // should be the base image, overriding the previous page's image.
    const baseImage = referenceImageUrl || previousImageUrl || BLANK_WHITE_IMAGE_512_JPG;
    const { base64: base64Base, mimeType: mimeTypeBase } = await imageUrlToBase64(baseImage);
    parts.push({ inlineData: { data: base64Base, mimeType: mimeTypeBase } });
    
    if (promptData.referenceImageUrls.style) {
        const { base64, mimeType } = await imageUrlToBase64(promptData.referenceImageUrls.style);
        parts.push({ inlineData: { data: base64, mimeType } });
    }
    if (promptData.referenceImageUrls.character) {
        const { base64, mimeType } = await imageUrlToBase64(promptData.referenceImageUrls.character);
        parts.push({ inlineData: { data: base64, mimeType } });
    }

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
            return { imageUrl };
        }
    }
    
    throw new Error("La generazione dell'immagine non ha prodotto un risultato visivo. Riprova con un prompt diverso.");
};

/**
 * Regenerates the text for a single page based on user modification instructions.
 */
export const regeneratePageText = async (promptData: PromptData, previousPageText: string | null, originalText: string, modificationPrompt: string): Promise<string> => {
    const systemInstruction = `You are an AI author for children's books, tasked with rewriting a single page of a story.
- Rewrite the 'Original Text' based on the 'Modification Instruction'.
- Keep the new text appropriate for the target age: ${promptData.targetAge}.
- Ensure the new text flows logically from the 'Previous Page Content'.
- Your response should contain ONLY the rewritten text for the page, without any extra commentary.`;

    const contents = `
        - Previous Page Content: "${previousPageText || 'This is the first page.'}"
        - Original Text to Modify: "${stripHtml(originalText)}"
        - Modification Instruction: "${modificationPrompt || 'Make it better.'}"
    `;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return formatTextWithLineBreaks(stripHtml(response.text));
};

/**
 * Translates a given text to a target language, preserving text within ""..."" markers.
 */
export const translateText = async (text: string, targetLanguage: 'en' | 'it'): Promise<string> => {
    if (!text) return '';

    const literals: string[] = [];
    const placeholderPrefix = "__LITERAL_TEXT_";
    const placeholderRegex = new RegExp(`${placeholderPrefix}(\\d+)__`, 'g');

    // 1. Extract literals (content inside "") and replace with placeholders.
    const textWithPlaceholders = text.replace(/""(.*?)""/g, (match, p1) => {
        literals.push(p1);
        return `${placeholderPrefix}${literals.length - 1}__`;
    });

    // Optimization: If the text *only* contained literals, no need to call the API.
    if (!textWithPlaceholders.trim().replace(placeholderRegex, '').trim() && literals.length > 0) {
         return literals.map(lit => `"${lit}"`).join(' ');
    }

    try {
        // 2. Translate text with placeholders, instructing the AI not to translate them.
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Translate the following text to ${targetLanguage}. Do not translate placeholders like ${placeholderPrefix}0__. Return ONLY the translated text. The text is: "${textWithPlaceholders}"`,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        let translatedText = response.text.trim();

        // 3. Re-insert literals back into the translated text, wrapped in standard double quotes.
        translatedText = translatedText.replace(placeholderRegex, (match, p1) => {
            const index = parseInt(p1, 10);
            if (index >= 0 && index < literals.length) {
                return `"${literals[index]}"`; // The literal is re-inserted with standard quotes
            }
            return match;
        });

        return translatedText;

    } catch (error) {
        console.error(`Translation to ${targetLanguage} failed`, error);
        throw new Error(`Impossibile tradurre il testo.`);
    }
};

/**
 * Generates an image prompt based on a snippet of story text.
 */
export const generatePromptFromText = async (pageText: string): Promise<string> => {
    const systemInstruction = `You are an AI assistant. Based on the following story text for a single page, create a detailed, SFW, English-language prompt for an image generation model. 
- The prompt should vividly describe the scene, characters, and actions.
- Do not include stylistic instructions like "in the style of...". Focus only on the content.
- Return ONLY the prompt text, without any additional explanations or markdown formatting.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `Here is the text for the page: "${stripHtml(pageText)}"`,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating prompt from text:", error);
        // Return a fallback prompt
        return "A beautiful and enchanting illustration for a children's storybook.";
    }
};
