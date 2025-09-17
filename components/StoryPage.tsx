import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StoryPage as StoryPageType, PromptData } from '../types';
import { generatePageImage, regeneratePageText, translateText } from '../services/geminiService';
import { stripHtml } from '../utils/textUtils';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { WarningIcon } from './icons/WarningIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { InfoIcon } from './icons/InfoIcon';
import { XIcon } from './icons/XIcon';

interface StoryPageProps {
  page: StoryPageType;
  index: number;
  isCover: boolean;
  onUpdate: (page: StoryPageType) => void;
  promptData: PromptData;
  previousPageText: string | null;
  previousPageImageUrl: string | null;
  onCancelImageGeneration: (index: number) => void;
}

const RichTextToolbar: React.FC<{
  isCover: boolean;
  onCommand: (cmd: string) => void;
  textAlign: string;
  onTextAlignChange: (align: 'left' | 'center' | 'right') => void;
}> = ({ isCover, onCommand, textAlign, onTextAlignChange }) => {
  const formatButtons = [
    { cmd: 'bold', label: 'B' },
    { cmd: 'italic', label: 'I' },
    { cmd: 'underline', label: 'S' },
  ];
  const alignButtons = [
    { cmd: 'justifyLeft', align: 'left', label: 'Sinistra' },
    { cmd: 'justifyCenter', align: 'center', label: 'Centro' },
    { cmd: 'justifyRight', align: 'right', label: 'Destra' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-t-md bg-gray-100 border-b border-gray-300">
      {formatButtons.map(({ cmd, label }) => (
        <button
          key={cmd}
          onMouseDown={(e) => { e.preventDefault(); onCommand(cmd); }}
          className="px-3 py-1 font-semibold rounded hover:bg-gray-200"
          title={cmd.charAt(0).toUpperCase() + cmd.slice(1)}
        >
          {label}
        </button>
      ))}
      {isCover && <div className="w-px h-5 bg-gray-300 mx-1"></div>}
      {isCover && alignButtons.map(({ cmd, align, label }) => (
          <button
            key={cmd}
            onMouseDown={(e) => {
              e.preventDefault();
              onCommand(cmd);
              onTextAlignChange(align as 'left' | 'center' | 'right');
            }}
            className={`px-3 py-1 rounded hover:bg-gray-200 ${textAlign === align ? 'bg-indigo-100' : ''}`}
            title={label}
          >
            {label}
          </button>
        ))}
    </div>
  );
};


const StoryPage: React.FC<StoryPageProps> = ({ page, index, isCover, onUpdate, promptData, previousPageText, previousPageImageUrl, onCancelImageGeneration }) => {
  const { bookStyle: globalBookStyle, textStyle: globalTextStyle } = promptData;
  const [copied, setCopied] = useState(false);
  const [pageBookStyle, setPageBookStyle] = useState(globalBookStyle);
  const [textAlign, setTextAlign] = useState(page.textAlign || (isCover ? 'center' : 'left'));
  
  const [displayedPrompt, setDisplayedPrompt] = useState('Traduzione in corso...');
  const [isPromptDirty, setIsPromptDirty] = useState(false);
  const [isTextDirtyForImage, setIsTextDirtyForImage] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState('');
  
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  
  const effectiveTextStyle = page.textStyle || globalTextStyle;
  const isImageBusy = page.imageStatus === 'generating';
  const isBusy = isImageBusy || isGeneratingText || isTranslating;

  const translateForDisplay = useCallback(async (englishPrompt: string) => {
    if (!englishPrompt) {
      setDisplayedPrompt('');
      return;
    }
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const italianPrompt = await translateText(englishPrompt, 'it');
      setDisplayedPrompt(italianPrompt);
    } catch (err) {
      console.error("Translation to Italian failed:", err);
      setTranslationError("Traduzione fallita. Verrà mostrato il prompt originale in inglese.");
      setDisplayedPrompt(englishPrompt); // Fallback to original prompt
    } finally {
      setIsTranslating(false);
    }
  }, []);

  useEffect(() => {
    if(editorRef.current && editorRef.current.innerHTML !== page.text) {
        editorRef.current.innerHTML = page.text;
    }
    setIsTextDirtyForImage(false); // Reset when page data changes from parent
  }, [page.text]);
  
  useEffect(() => {
    setPageBookStyle(globalBookStyle);
  }, [globalBookStyle]);
  
  useEffect(() => {
    // This effect runs when the source english prompt changes
    if (page.finalImagePrompt && !isPromptDirty) {
      translateForDisplay(page.finalImagePrompt);
    }
  }, [page.finalImagePrompt, isPromptDirty, translateForDisplay]);


  const handleTextChange = () => {
    if (editorRef.current) {
        setIsTextDirtyForImage(true);
        onUpdate({ ...page, text: editorRef.current.innerHTML, textAlign });
    }
  };

  const handleCommand = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
    handleTextChange();
  };
  
  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    onUpdate({ ...page, text: editorRef.current?.innerHTML || page.text, textAlign: align });
  };
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDisplayedPrompt(e.target.value);
    setIsPromptDirty(true);
  };
  
  const handleResetPrompt = () => {
     if (page.finalImagePrompt) {
        translateForDisplay(page.finalImagePrompt);
        setIsPromptDirty(false);
     }
  };
  
  const handleLocalTextStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newStyle = { ...effectiveTextStyle, [name]: value };
    onUpdate({ ...page, textStyle: newStyle });
  };
  
  const handleResetToGlobalStyle = () => {
    const { textStyle, ...pageWithoutTextStyle } = page;
    onUpdate(pageWithoutTextStyle);
  };

  const handleRegenerateImage = async () => {
    onUpdate({ ...page, imageStatus: 'generating', imageError: null });
    setTranslationError(null);
    setIsTextDirtyForImage(false);

    try {
      // Step 1: Translate the user-edited Italian prompt back to English
      const englishPrompt = await translateText(displayedPrompt, 'en');

      // Step 2: Generate the image using the new English prompt, providing previous image for context
      const newImageUrl = await generatePageImage(englishPrompt, promptData, previousPageImageUrl);
      
      // Step 3: Update the page state with the new image and the new *English* prompt as the source of truth
      onUpdate({ ...page, imageUrl: newImageUrl, imageStatus: 'done', imageError: null, finalImagePrompt: englishPrompt });
      setIsPromptDirty(false); // Reset dirty state, which will trigger re-translation for display

    } catch (err) {
      console.error("Image regeneration failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      let displayError = "Impossibile rigenerare l'immagine.";
       if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
            displayError = "Hai raggiunto il limite di immagini che puoi generare per oggi. Riprova più tardi.";
       } else if (errorMessage.toLowerCase().includes('tradurre')) {
           displayError = "Fallimento nella traduzione del prompt in inglese. Riprova."
       }
      onUpdate({ ...page, imageStatus: 'error', imageError: displayError });
    }
  };

  const handleRegenerateText = async () => {
    setIsGeneratingText(true);
    setTextError(null);
    try {
        const newText = await regeneratePageText(promptData, previousPageText, page.text, modificationPrompt);
        if (editorRef.current) {
            editorRef.current.innerHTML = newText;
        }
        onUpdate({ ...page, text: newText });
        setIsTextDirtyForImage(true); // After text regen, image is likely out of sync
    } catch (err) {
        console.error("Text regeneration failed:", err);
        const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
            setTextError("Hai raggiunto il limite di richieste per oggi. Riprova più tardi.");
        } else {
            setTextError(`Impossibile rigenerare il testo.`);
        }
    } finally {
        setIsGeneratingText(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(displayedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectClasses = "p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-xs";
  const fontSizes = [];
  for (let i = 8; i <= 36; i += 2) {
      fontSizes.push(i);
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Image Side */}
      <div>
        <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-md overflow-hidden shadow-inner">
            <img src={page.imageUrl} alt={`Illustrazione per la pagina ${index + 1}`} className={`w-full h-full object-cover transition-opacity duration-300 ${isImageBusy ? 'opacity-30' : 'opacity-100'}`} />
            
            {(page.imageStatus === 'generating' || page.imageStatus === 'pending') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white text-center rounded-md bg-black/70">
                    {page.imageStatus === 'generating' ? (
                        <>
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                            <p>Sto disegnando...</p>
                             <button
                                onClick={() => onCancelImageGeneration(index)}
                                className="mt-4 flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full shadow hover:bg-red-700"
                            >
                                <XIcon className="w-4 h-4"/> Annulla
                            </button>
                        </>
                    ) : (
                       <p>{page.imageError ? page.imageError : 'In attesa di generazione...'}</p>
                    )}
                </div>
            )}
            
            {page.imageStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white text-center rounded-md bg-red-900/80">
                    <WarningIcon className="w-10 h-10 mb-2 text-red-300"/>
                    <p className="text-sm">{page.imageError}</p>
                </div>
            )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
            <button
                onClick={handleRegenerateImage}
                disabled={isBusy}
                className={`flex-grow flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-wait ${isTextDirtyForImage ? 'animate-pulse' : ''}`}
            >
                <SparklesIcon className="w-4 h-4" /> Rigenera Immagine
            </button>
            <div className="flex-grow flex items-center gap-2">
                 <button
                    onClick={handleCopyPrompt}
                    title="Copia il prompt dell'immagine"
                    className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 h-full"
                >
                    {copied ? "Copiato!" : <ClipboardIcon className="w-5 h-5" />}
                </button>
                <select
                  value={pageBookStyle}
                  onChange={(e) => {
                    setPageBookStyle(e.target.value as PromptData['bookStyle']);
                    // Changing style makes the prompt dirty as it affects the final output
                    setIsPromptDirty(true); 
                  }}
                  className="flex-grow h-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
                  title="Stili Veloci per questa immagine"
                  disabled={isBusy}
                >
                    <option value="toddler">Bambini Piccoli</option>
                    <option value="classic">Classico</option>
                    <option value="comic">Fumetto</option>
                    <option value="photo">Fotografia</option>
                </select>
            </div>
        </div>
        <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    Prompt completo per l'immagine
                    <span className="cursor-help" title="Il prompt viene tradotto in italiano per la modifica. Quando rigeneri, viene ritradotto in inglese per l'IA.">
                        <InfoIcon className="w-4 h-4 text-gray-400"/>
                    </span>
                </label>
                {isPromptDirty && 
                    <button onClick={handleResetPrompt} title="Annulla le modifiche e torna al prompt originale" className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800">
                        <RefreshIcon className="w-3 h-3"/> Reset
                    </button>
                }
            </div>
            {translationError && <p className="text-xs text-red-600 my-1">{translationError}</p>}
            <textarea
                value={displayedPrompt}
                onChange={handlePromptChange}
                className="mt-1 block w-full text-xs p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
                rows={4}
                disabled={isBusy}
                placeholder={isTranslating ? 'Traduzione in corso...' : 'Inserisci un prompt...'}
            />
        </div>
      </div>
      {/* Text Side */}
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-1 gap-4">
            <label className="text-sm font-medium text-gray-500">
            {isCover ? 'Titolo' : `Pagina ${index + 1}`}
            </label>
        </div>

        {textError && (
        <div className="my-2 p-2 text-sm text-red-800 bg-red-100 border border-red-300 rounded-md flex items-center gap-2">
            <WarningIcon className="w-5 h-5 flex-shrink-0" /> <span>{textError}</span>
        </div>
        )}
        
        {isGeneratingText && (
        <div className="my-2 p-2 text-sm text-gray-700 bg-gray-100 border rounded-md text-center animate-pulse">
            Sto riscrivendo...
        </div>
        )}

        <div className="border border-gray-300 rounded-md overflow-hidden flex-grow flex flex-col">
            <RichTextToolbar 
              isCover={isCover} 
              onCommand={handleCommand}
              textAlign={textAlign}
              onTextAlignChange={handleTextAlignChange}
            />
            <div
              ref={editorRef}
              contentEditable={!isBusy}
              suppressContentEditableWarning={true}
              onBlur={handleTextChange}
              style={{ 
                textAlign,
                fontFamily: effectiveTextStyle.fontFamily,
                fontSize: effectiveTextStyle.fontSize,
                textTransform: effectiveTextStyle.textTransform as any
              }}
              className="flex-grow p-3 min-h-[150px] bg-white focus:outline-none prose max-w-full"
              dangerouslySetInnerHTML={{ __html: page.text }}
            />
        </div>
        
        {/* Text Style Controls */}
        <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Stile Testo Pagina</label>
                {page.textStyle && (
                    <button onClick={handleResetToGlobalStyle} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800">
                        <RefreshIcon className="w-3 h-3"/> Usa Stile Globale
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2">
                <select name="fontFamily" value={effectiveTextStyle.fontFamily} onChange={handleLocalTextStyleChange} className={selectClasses} title="Font del testo" disabled={isBusy}>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica (Sans-serif)</option>
                    <option value="'Comic Sans MS', cursive, sans-serif">Comic Sans (Giocoso)</option>
                </select>
                <select name="fontSize" value={effectiveTextStyle.fontSize} onChange={handleLocalTextStyleChange} className={selectClasses} title="Dimensione del testo" disabled={isBusy}>
                    {fontSizes.map(size => (
                        <option key={size} value={`${size}pt`}>{size} pt</option>
                    ))}
                </select>
                <select name="textTransform" value={effectiveTextStyle.textTransform} onChange={handleLocalTextStyleChange} className={selectClasses} title="Trasformazione testo" disabled={isBusy}>
                    <option value="none">Normale</option>
                    <option value="uppercase">Tutto Maiuscolo</option>
                    <option value="lowercase">Tutto Minuscolo</option>
                </select>
            </div>
        </div>
        
        {/* AI Text Modification Controls */}
        <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
            <label htmlFor={`mod-prompt-${index}`} className="block text-xs font-medium text-gray-600 mb-1">Modifica testo con IA</label>
            <textarea
                id={`mod-prompt-${index}`}
                value={modificationPrompt}
                onChange={(e) => setModificationPrompt(e.target.value)}
                placeholder="Es: Rendilo più divertente, aggiungi un ruscello..."
                className="mt-1 block w-full text-xs p-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
                disabled={isBusy}
            />
            <button
                onClick={handleRegenerateText}
                disabled={isBusy}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-teal-600 text-white rounded-md shadow hover:bg-teal-700 disabled:bg-teal-400 transition-colors"
            >
                <SparklesIcon className="w-4 h-4" /> Esegui Modifica
            </button>
        </div>

      </div>
    </div>
  );
};

export default StoryPage;