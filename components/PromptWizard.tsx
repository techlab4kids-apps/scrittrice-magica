import React, { useState, useEffect } from 'react';
import { PromptData } from '../types';
import { ImageUploader } from './ImageUploader';
import { RefreshIcon } from './icons/RefreshIcon';

interface PromptWizardProps {
  onSubmit: (data: PromptData) => void;
  disabled?: boolean;
}

const initialPromptData: PromptData = {
    themes: '',
    otherElements: '',
    targetAge: '3-5 anni',
    bookStyle: 'toddler',
    author: 'AI Cantastorie',
    license: 'CC BY-NC 4.0',
    referenceImageUrls: {
        style: null,
        character: null,
    },
    textStyle: {
        fontFamily: 'Georgia, serif',
        fontSize: '18pt',
        textTransform: 'none',
    },
    autoGenerateImages: true,
    storyInputMode: 'generate', // Default mode
    pageCount: '5-7',
    customTitle: '',
    customText: '',
};

const themeSuggestions = [ "L'importanza dell'amicizia", "Superare le proprie paure", "Un'avventura in un bosco incantato", "Il primo giorno di scuola", "Imparare a condividere", "Un viaggio sulla luna", "Il mistero del giocattolo scomparso", "La magia della gentilezza", "Un picnic sotto le stelle", "Salvare un animale in difficoltà"];
const elementSuggestions = [ "Un orsetto coraggioso di nome Barnaby", "Una fatina dispettosa con le ali scintillanti", "Un vecchio albero saggio che sa parlare", "Un cucciolo di drago che non sa sputare fuoco", "Una mappa del tesoro misteriosa", "Una navicella spaziale fatta di cartone", "Un robot curioso che ama i fiori", "Una sirena che ha paura dell'acqua", "Un fantasma timido che vive in una biblioteca" ];

const getRandomSuggestions = (arr: string[], count: number) => {
    return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


const PromptWizard: React.FC<PromptWizardProps> = ({ onSubmit, disabled = false }) => {
  const [promptData, setPromptData] = useState<PromptData>(initialPromptData);
  const [currentThemeSuggestions, setCurrentThemeSuggestions] = useState<string[]>([]);
  const [currentElementSuggestions, setCurrentElementSuggestions] = useState<string[]>([]);
  
  const [styleImageFile, setStyleImageFile] = useState<File | null>(null);
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);

  useEffect(() => {
    shuffleSuggestions();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (styleImageFile) {
        fileToDataUrl(styleImageFile).then(dataUrl => {
            if (isMounted) {
                setPromptData(prev => ({ ...prev, referenceImageUrls: { ...prev.referenceImageUrls, style: dataUrl } }));
            }
        });
    } else {
        setPromptData(prev => ({ ...prev, referenceImageUrls: { ...prev.referenceImageUrls, style: null } }));
    }
    return () => { isMounted = false; };
  }, [styleImageFile]);

  useEffect(() => {
      let isMounted = true;
      if (characterImageFile) {
          fileToDataUrl(characterImageFile).then(dataUrl => {
              if (isMounted) {
                  setPromptData(prev => ({ ...prev, referenceImageUrls: { ...prev.referenceImageUrls, character: dataUrl } }));
              }
          });
      } else {
          setPromptData(prev => ({ ...prev, referenceImageUrls: { ...prev.referenceImageUrls, character: null } }));
      }
      return () => { isMounted = false; };
  }, [characterImageFile]);


  const shuffleSuggestions = () => {
    setCurrentThemeSuggestions(getRandomSuggestions(themeSuggestions, 3));
    setCurrentElementSuggestions(getRandomSuggestions(elementSuggestions, 3));
  };
  
  const handleSuggestionClick = (field: keyof PromptData, value: string) => {
    setPromptData(prev => ({
        ...prev,
        [field]: prev[field] ? `${prev[field]}, ${value}` : value
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setPromptData(prev => ({...prev, [name]: checked }));
    } else {
        setPromptData(prev => ({ ...prev, [name]: value as any }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(promptData);
  };
  
  const setInputMode = (mode: 'generate' | 'custom') => {
    setPromptData(prev => ({ ...prev, storyInputMode: mode }));
  };

  const inputClasses = "mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400";
  
  const renderGenerateMode = () => (
     <div className="space-y-4 animate-fade-in">
        <div>
            <label htmlFor="themes" className="block text-sm font-medium text-gray-700">Temi principali</label>
            <input type="text" name="themes" id="themes" value={promptData.themes} onChange={handleChange} className={inputClasses} placeholder="Es. amicizia, coraggio, avventura nella foresta" required disabled={disabled}/>
            <div className="flex flex-wrap gap-2 mt-2">
            {currentThemeSuggestions.map(suggestion => (
                <button type="button" key={suggestion} onClick={() => handleSuggestionClick('themes', suggestion)} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full hover:bg-indigo-200" disabled={disabled}>
                {suggestion}
                </button>
            ))}
            </div>
        </div>
        <div>
            <label htmlFor="otherElements" className="block text-sm font-medium text-gray-700">Personaggi o elementi chiave</label>
            <textarea name="otherElements" id="otherElements" rows={3} value={promptData.otherElements} onChange={handleChange} className={inputClasses} placeholder="Es. Un coniglio timido di nome Leo, una volpe saggia, un fiume magico" required disabled={disabled}/>
            <div className="flex flex-wrap gap-2 mt-2">
            {currentElementSuggestions.map(suggestion => (
                <button type="button" key={suggestion} onClick={() => handleSuggestionClick('otherElements', suggestion)} className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full hover:bg-teal-200" disabled={disabled}>
                {suggestion}
                </button>
            ))}
            </div>
        </div>
        <div className="flex justify-between items-center pt-2">
            <div>
                <label htmlFor="pageCount" className="block text-sm font-medium text-gray-700">Numero di Pagine (circa)</label>
                <input type="text" name="pageCount" id="pageCount" value={promptData.pageCount} onChange={handleChange} className={`${inputClasses} w-24`} required disabled={disabled}/>
            </div>
            <button type="button" onClick={shuffleSuggestions} className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300 self-end" disabled={disabled}>
                <RefreshIcon className="w-4 h-4" /> Nuovi Suggerimenti
            </button>
        </div>
     </div>
  );
  
  const renderCustomTextMode = () => (
     <div className="space-y-4 animate-fade-in">
        <div>
            <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700">Titolo della Storia</label>
            <input type="text" name="customTitle" id="customTitle" value={promptData.customTitle} onChange={handleChange} className={inputClasses} placeholder="Inserisci qui il titolo" required disabled={disabled}/>
        </div>
         <div>
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700">Testo della Storia</label>
            <textarea name="customText" id="customText" rows={8} value={promptData.customText} onChange={handleChange} className={inputClasses} placeholder="Incolla qui il testo della tua storia. Lascia una o più righe vuote tra il testo di una pagina e la successiva per separarle." required disabled={disabled}/>
             <p className="text-xs text-gray-500 mt-1">L'app dividerà il testo in pagine dove trova una riga vuota.</p>
        </div>
     </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">Crea la Tua Storia</h2>
      <p className="text-center text-gray-600 mb-6">
        Scegli come vuoi iniziare: lascia che l'IA scriva per te o fornisci il tuo testo.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Input Mode Picker */}
        <div className="flex justify-center p-1 bg-gray-200 rounded-lg">
            <button
                type="button"
                onClick={() => setInputMode('generate')}
                className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${promptData.storyInputMode === 'generate' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}
            >
                Genera Storia (AI)
            </button>
             <button
                type="button"
                onClick={() => setInputMode('custom')}
                className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${promptData.storyInputMode === 'custom' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}
            >
                Inserisci Testo
            </button>
        </div>
      
        {/* Story Content */}
        <div className="p-4 border rounded-lg border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold mb-2">Contenuto della Storia</h3>
            {promptData.storyInputMode === 'generate' ? renderGenerateMode() : renderCustomTextMode()}
        </div>

        {/* Style and Details */}
        <div className="p-4 border rounded-lg border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold mb-2">Stile e Dettagli</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="targetAge" className="block text-sm font-medium text-gray-700">Fascia d'età</label>
                    <input type="text" name="targetAge" id="targetAge" value={promptData.targetAge} onChange={handleChange} className={inputClasses} required disabled={disabled}/>
                </div>
                <div>
                    <label htmlFor="bookStyle" className="block text-sm font-medium text-gray-700">Stile del Libro</label>
                    <select name="bookStyle" id="bookStyle" value={promptData.bookStyle} onChange={handleChange} className={inputClasses} disabled={disabled}>
                        <option value="toddler">Bambini Piccoli (colori vivaci, forme semplici)</option>
                        <option value="classic">Classico (stile acquerello, fiabesco)</option>
                        <option value="comic">Fumetto (linee decise, colori piatti)</option>
                        <option value="photo">Fotografia (stile realistico)</option>
                    </select>
                </div>
            </div>
             <div className="mt-4">
                <div className="flex items-center">
                    <input
                        id="autoGenerateImages"
                        name="autoGenerateImages"
                        type="checkbox"
                        checked={promptData.autoGenerateImages}
                        onChange={handleChange}
                        disabled={disabled}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="autoGenerateImages" className="ml-2 block text-sm text-gray-900">
                        Genera immagini automaticamente
                    </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">Se deselezionato, dovrai generare ogni immagine manually nell'editor.</p>
            </div>
        </div>

        {/* Image References (Optional) */}
        <div className="p-4 border rounded-lg border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Riferimenti Visivi (Opzionale)</h3>
             <p className="text-sm text-gray-500 mb-4">
                Fornisci immagini di riferimento per guidare lo stile artistico o l'aspetto dei personaggi.
             </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploader title="Immagine per lo stile" onFileSelect={setStyleImageFile} />
                <ImageUploader title="Immagine per il personaggio" onFileSelect={setCharacterImageFile} />
            </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            {disabled ? 'Generazione in Corso...' : 'Genera la Mia Storia!'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptWizard;
