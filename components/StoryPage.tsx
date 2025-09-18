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
import { HistoryIcon } from './icons/HistoryIcon';
import PromptHistoryPopup from './PromptHistoryPopup';


interface StoryPageProps {
  page: StoryPageType;
  index: number;
  isCover: boolean;
  onUpdate: (page: StoryPageType) => void;
  promptData: PromptData;
  previousPageText: string | null;
  previousPageImageUrl: string | null;
  onCancelImageGeneration: (index: number) => void;
  draggedPageIndex: number | null;
  setDraggedPageIndex: (index: number | null) => void;
  allPages: StoryPageType[];
}

const PLACEHOLDER_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const isPlaceholderImage = (url: string | null | undefined): boolean => {
    if (!url) return true;
    return url === PLACEHOLDER_IMAGE_URL;
};


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
          className="px-3 py-1 font-semibold rounded hover:bg-gray-200 text-gray-800"
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
            className={`px-3 py-1 rounded hover:bg-gray-200 text-gray-800 ${textAlign === align ? 'bg-indigo-100' : ''}`}
            title={label}
          >
            {label}
          </button>
        ))}
    </div>
  );
};


const StoryPage: React.FC<StoryPageProps> = ({ page, index, isCover, onUpdate, promptData, previousPageText, previousPageImageUrl, onCancelImageGeneration, draggedPageIndex, setDraggedPageIndex, allPages }) => {
  const { textStyle: globalTextStyle } = promptData;
  const [copied, setCopied] = useState(false);
  const [textAlign, setTextAlign] = useState(page.textAlign || (isCover ? 'center' : 'left'));
  
  const currentPrompt = page.imagePromptHistory[page.imagePromptHistory.length - 1] || '';
  const [displayedPrompt, setDisplayedPrompt] = useState(currentPrompt);
  const [isPromptItalian, setIsPromptItalian] = useState(false);
  const [isPromptDirty, setIsPromptDirty] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState('');
  
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  
  const effectiveTextStyle = page.textStyle || globalTextStyle;
  const isImageBusy = page.imageStatus === 'generating';
  const isBusy = isImageBusy || isGeneratingText || isTranslating;
  
  useEffect(() => {
    const latestPrompt = page.imagePromptHistory[page.imagePromptHistory.length - 1] || '';
    setDisplayedPrompt(latestPrompt);
    setIsPromptItalian(false);
    setIsPromptDirty(false);
    setTranslationError(null);
  }, [page.imagePromptHistory]);
  
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== page.text) {
        editorRef.current.innerHTML = page.text;
    }
  }, [page.text]);
  
  useEffect(() => {
    const latestPrompt = page.imagePromptHistory[page.imagePromptHistory.length - 1] || '';
    setIsPromptDirty(displayedPrompt !== latestPrompt);
  }, [displayedPrompt, page.imagePromptHistory]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerHTML;
    if (page.text !== newText) {
      onUpdate({ ...page, text: newText });
    }
  };

  const syncStateFromDOM = () => {
    if (editorRef.current) {
        const newText = editorRef.current.innerHTML;
        if(page.text !== newText) {
            onUpdate({ ...page, text: newText });
        }
    }
  };

  const handleCommand = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
    syncStateFromDOM();
  };
  
  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    onUpdate({ ...page, textAlign: align });
  };
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDisplayedPrompt(e.target.value);
  };
  
  const handleToggleTranslation = async () => {
    if (isTranslating) return;
    const originalPrompt = page.imagePromptHistory[page.imagePromptHistory.length - 1] || '';

    if (isPromptItalian) {
        setDisplayedPrompt(originalPrompt);
        setIsPromptItalian(false);
        setTranslationError(null);
    } else {
        setIsTranslating(true);
        setTranslationError(null);
        try {
            const italianPrompt = await translateText(displayedPrompt, 'it');
            setDisplayedPrompt(italianPrompt);
            setIsPromptItalian(true);
        } catch (err) {
            setTranslationError("Traduzione fallita. Riprova.");
            setDisplayedPrompt(originalPrompt);
        } finally {
            setIsTranslating(false);
        }
    }
  };
  
  const handleResetPrompt = () => {
     const latestPrompt = page.imagePromptHistory[page.imagePromptHistory.length - 1] || '';
     setDisplayedPrompt(latestPrompt);
     setIsPromptItalian(false);
     setTranslationError(null);
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

  const handleRegenerateImage = async (referenceImageUrl?: string | null) => {
    onUpdate({ ...page, imageStatus: 'generating', imageError: null });
    setTranslationError(null);

    try {
      let englishPrompt = displayedPrompt;
      if (isPromptItalian || isPromptDirty) {
          englishPrompt = await translateText(displayedPrompt, 'en');
      }

      const { imageUrl: newImageUrl } = await generatePageImage(englishPrompt, promptData, previousPageImageUrl, referenceImageUrl);
      
      const newHistory = [...page.imagePromptHistory, englishPrompt];
      
      onUpdate({ 
        ...page, 
        imageUrl: newImageUrl, 
        imageStatus: 'done', 
        imageError: null, 
        imagePromptHistory: newHistory
      });

    } catch (err) {
        console.error("Image regeneration failed:", err);
        const errorString = err instanceof Error ? err.message : JSON.stringify(err);
        let displayError = "Impossibile rigenerare l'immagine.";

        const isRateLimitError = errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429");
        const isTranslationError = errorString.toLowerCase().includes('tradurre');
        const isInvalidArgumentError = errorString.includes("INVALID_ARGUMENT");
        const isCleaningError = errorString.includes("pulire il prompt");

        if (isRateLimitError) {
            displayError = "Limite richieste API raggiunto. Riprova più tardi.";
        } else if (isTranslationError) {
            displayError = "Fallimento nella traduzione del prompt per l'IA. Controlla il testo e riprova.";
        } else if (isInvalidArgumentError) {
            displayError = "Una delle immagini di input (riferimento, pagina precedente) non è valida. Prova a rigenerare la pagina precedente prima.";
        } else if (isCleaningError) {
            displayError = "Impossibile elaborare il prompt per l'IA. Controlla il testo e riprova.";
        }
        
        onUpdate({ ...page, imageStatus: 'error', imageError: displayError });
    }
  };
  
  const handlePromptBlur = async () => {
    if (!isPromptDirty || isBusy || isPromptItalian) {
      return;
    }

    // FIX: Replaced .at(-1) with standard array access for wider JS compatibility.
    if (displayedPrompt.trim() === (page.imagePromptHistory[page.imagePromptHistory.length - 1] || '').trim()) {
      setIsPromptDirty(false);
      return;
    }
    
    // Create a temporary history with the un-translated prompt for optimistic UI update
    const newHistory = [...page.imagePromptHistory];
    newHistory[newHistory.length] = displayedPrompt; // Temporarily add it
    
    // Send update to parent, which will trigger re-render and useEffect
    onUpdate({
      ...page,
      imagePromptHistory: newHistory,
    });
  };


  const handleRegenerateText = async () => {
    setIsGeneratingText(true);
    setTextError(null);
    try {
        const newText = await regeneratePageText(promptData, previousPageText, page.text, modificationPrompt);
        onUpdate({ ...page, text: newText });
    } catch (err) {
        setTextError(`Impossibile rigenerare il testo.`);
    } finally {
        setIsGeneratingText(false);
    }
  };
  
  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      const refImageUrl = allPages[draggedPageIndex].imageUrl;
      handleRegenerateImage(refImageUrl);
      setDraggedPageIndex(null); // Clear after drop
    }
  };


  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(displayedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectClasses = "p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-xs text-gray-900";
  const fontSizes = [];
  for (let i = 8; i <= 36; i += 2) {
      fontSizes.push(i);
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Image Side */}
      <div>
        <div 
          className={`relative aspect-[4/3] w-full bg-gray-100 rounded-md overflow-hidden shadow-inner group transition-all duration-300 ${isDragOver ? 'ring-4 ring-indigo-500 ring-offset-2' : ''}`}
          draggable="true"
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
            <img src={page.imageUrl} alt={`Illustrazione per la pagina ${index + 1}`} className={`w-full h-full object-cover transition-opacity duration-300 ${isImageBusy ? 'opacity-30' : 'opacity-100'}`} />
            
            <div 
              className="absolute top-2 right-2"
              onMouseEnter={() => setIsHistoryVisible(true)}
              onMouseLeave={() => setIsHistoryVisible(false)}
            >
              <HistoryIcon className="w-6 h-6 text-white bg-black/50 rounded-full p-1 cursor-pointer hover:bg-black/70" />
              {isHistoryVisible && <PromptHistoryPopup history={page.imagePromptHistory} />}
            </div>

            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-white text-center rounded-md bg-black/70 font-bold">
                  Rilascia per rigenerare con questo stile
              </div>
            )}
            
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
                onClick={() => {
                    const selfReferenceUrl = !isPlaceholderImage(page.imageUrl) ? page.imageUrl : null;
                    handleRegenerateImage(selfReferenceUrl);
                }}
                disabled={isBusy}
                className={`flex-grow flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-wait ${isPromptDirty ? 'animate-pulse' : ''}`}
            >
                <SparklesIcon className="w-4 h-4" /> Rigenera Immagine
            </button>
            <button
                onClick={handleCopyPrompt}
                title="Copia il prompt dell'immagine"
                className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
                {copied ? "Copiato!" : <ClipboardIcon className="w-5 h-5" />}
            </button>
        </div>
        <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800">
                    Prompt per l'immagine
                    <span className="cursor-help" title="Il prompt per l'IA deve essere in inglese. Puoi tradurlo per modificarlo più facilmente in italiano.">
                        <InfoIcon className="w-4 h-4 text-gray-400"/>
                    </span>
                </label>
                <div className="flex items-center gap-2">
                    {isPromptDirty && 
                        <button onClick={handleResetPrompt} title="Annulla le modifiche e torna al prompt originale" className="text-xs flex items-center gap-1 text-gray-700 hover:text-gray-800">
                            <RefreshIcon className="w-3 h-3"/> Reset
                        </button>
                    }
                    <button onClick={handleToggleTranslation} disabled={isTranslating} className="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                        {isTranslating ? '...' : (isPromptItalian ? 'Mostra Originale (EN)' : 'Traduci in Italiano')}
                    </button>
                </div>
            </div>
            {translationError && <p className="text-xs text-red-600 my-1">{translationError}</p>}
            <textarea
                value={displayedPrompt}
                onChange={handlePromptChange}
                onBlur={handlePromptBlur}
                className="mt-1 block w-full text-xs p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
                rows={4}
                disabled={isBusy}
                placeholder={isTranslating ? 'Salvataggio...' : 'Il prompt per l\'IA deve essere in inglese.'}
            />
        </div>
      </div>
      {/* Text Side */}
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-1">
             <h3 className="text-lg font-semibold text-gray-800">{isCover ? 'Titolo' : `Pagina ${index}`}</h3>
             {page.textStyle && (
                <button 
                    onClick={handleResetToGlobalStyle}
                    className="text-xs flex items-center gap-1 text-gray-700 hover:text-gray-800"
                    title="Ripristina lo stile del testo globale definito nei metadati"
                >
                    <RefreshIcon className="w-3 h-3"/> Reset Stile
                </button>
             )}
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
                <label htmlFor={`fontFamily-${index}`} className="text-gray-600">Font:</label>
                <select id={`fontFamily-${index}`} name="fontFamily" value={effectiveTextStyle.fontFamily} onChange={handleLocalTextStyleChange} className={selectClasses}>
                     <option value="Georgia, serif">Georgia (Serif)</option>
                     <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica (Sans-serif)</option>
                     <option value="'Comic Sans MS', cursive, sans-serif">Comic Sans (Giocoso)</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor={`fontSize-${index}`} className="text-gray-600">Size:</label>
                <select id={`fontSize-${index}`} name="fontSize" value={effectiveTextStyle.fontSize} onChange={handleLocalTextStyleChange} className={selectClasses}>
                    {fontSizes.map(size => (
                        <option key={size} value={`${size}pt`}>{size} pt</option>
                    ))}
                </select>
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor={`textTransform-${index}`} className="text-gray-600">Case:</label>
                <select id={`textTransform-${index}`} name="textTransform" value={effectiveTextStyle.textTransform} onChange={handleLocalTextStyleChange} className={selectClasses}>
                     <option value="none">Normale</option>
                     <option value="uppercase">MAIUSCOLO</option>
                     <option value="lowercase">minuscolo</option>
                </select>
            </div>
        </div>
        <div className="flex flex-col flex-grow border border-gray-300 rounded-md">
            <RichTextToolbar 
                isCover={isCover}
                onCommand={handleCommand}
                textAlign={textAlign}
                onTextAlignChange={handleTextAlignChange}
            />
            <div
                ref={editorRef}
                contentEditable={!isBusy}
                onInput={handleInput}
                suppressContentEditableWarning={true}
                className="flex-grow p-3 prose max-w-none focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-b-md text-gray-900"
                style={{
                  minHeight: '120px',
                  fontFamily: effectiveTextStyle.fontFamily,
                  fontSize: effectiveTextStyle.fontSize,
                  textAlign: page.textAlign || (isCover ? 'center' : 'left'),
                  textTransform: effectiveTextStyle.textTransform as any
                }}
            />
        </div>
        <div className="mt-2">
          <label htmlFor={`modificationPrompt-${index}`} className="text-xs font-medium text-gray-800">Prompt per rigenerare il testo (opzionale)</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              id={`modificationPrompt-${index}`}
              value={modificationPrompt}
              onChange={(e) => setModificationPrompt(e.target.value)}
              disabled={isBusy}
              placeholder="Es. 'Rendilo più divertente', 'Aggiungi una rima'"
              className="flex-grow block w-full text-xs p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200"
            />
            <button
                onClick={handleRegenerateText}
                disabled={isBusy}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-teal-600 text-white rounded-md shadow hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-wait"
            >
                <SparklesIcon className="w-4 h-4" /> Rigenera Testo
            </button>
          </div>
          {textError && <p className="text-xs text-red-600 mt-1">{textError}</p>}
        </div>
      </div>
    </div>
  );
};

export default StoryPage;