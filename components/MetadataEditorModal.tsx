import React, { useState } from 'react';
import { PromptData } from '../types';
import { XIcon } from './icons/XIcon';

interface MetadataEditorModalProps {
  initialData: PromptData;
  onSave: (updatedData: PromptData) => void;
  onClose: () => void;
}

const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({ initialData, onSave, onClose }) => {
  const [data, setData] = useState<PromptData>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };
  
  const handleTextStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      textStyle: {
        ...prev.textStyle,
        [name]: value,
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
    onClose();
  };

  const inputClasses = "w-full bg-gray-50 border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500";
  
  const fontSizes = [];
  for (let i = 8; i <= 36; i += 2) {
      fontSizes.push(i);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Modifica Dati Storia</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* General Info */}
            <fieldset className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Autore</label>
                  <input type="text" name="author" id="author" value={data.author} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-1">Licenza</label>
                  <select name="license" id="license" value={data.license} onChange={handleChange} className={inputClasses}>
                    <option value="CC BY 4.0">Creative Commons Attribution 4.0</option>
                    <option value="CC BY-SA 4.0">Creative Commons Attribution-ShareAlike 4.0</option>
                    <option value="CC BY-NC 4.0">Creative Commons Attribution-NonCommercial 4.0</option>
                    <option value="CC BY-NC-SA 4.0">Creative Commons Attribution-NonCommercial-ShareAlike 4.0</option>
                    <option value="CC0 1.0 Universal">Creative Commons Zero (Public Domain)</option>
                    <option value="All rights reserved">Tutti i diritti riservati</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="targetAge" className="block text-sm font-medium text-gray-700 mb-1">Fascia d'età</label>
                  <input type="text" name="targetAge" id="targetAge" value={data.targetAge} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label htmlFor="bookStyle" className="block text-sm font-medium text-gray-700 mb-1">Stile Illustrazioni</label>
                   <p className="text-xs text-gray-500 mb-1">I prompt usati per la rigenerazione possono sovrascrivere questa impostazione.</p>
                  <select name="bookStyle" id="bookStyle" value={data.bookStyle} onChange={handleChange} className={inputClasses}>
                      <option value="toddler">Bambini Piccoli</option>
                      <option value="classic">Classico</option>
                      <option value="comic">Fumetto</option>
                      <option value="photo">Fotografia</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Global Text Style */}
            <fieldset className="p-3 border rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-1">Stile del Testo Globale</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                        <label htmlFor="fontFamily" className="block text-xs font-medium text-gray-600 mb-1">Font</label>
                        <select name="fontFamily" id="fontFamily" value={data.textStyle.fontFamily} onChange={handleTextStyleChange} className={inputClasses}>
                             <option value="Georgia, serif">Georgia (Serif)</option>
                             <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica (Sans-serif)</option>
                             <option value="'Comic Sans MS', cursive, sans-serif">Comic Sans (Giocoso)</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="fontSize" className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                        <select name="fontSize" id="fontSize" value={data.textStyle.fontSize} onChange={handleTextStyleChange} className={inputClasses}>
                            {fontSizes.map(size => (
                                <option key={size} value={`${size}pt`}>{size} pt</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="textTransform" className="block text-xs font-medium text-gray-600 mb-1">Trasformazione</label>
                        <select name="textTransform" id="textTransform" value={data.textStyle.textTransform} onChange={handleTextStyleChange} className={inputClasses}>
                            <option value="none">Normale</option>
                            <option value="uppercase">Tutto Maiuscolo</option>
                            <option value="lowercase">Tutto Minuscolo</option>
                        </select>
                    </div>
                </div>
                 <div className="mt-4 p-4 border rounded-md bg-gray-100 flex items-center justify-center min-h-[6rem]">
                  <p
                    className="transition-all duration-200"
                    style={{
                      fontFamily: data.textStyle.fontFamily,
                      fontSize: data.textStyle.fontSize,
                      textTransform: data.textStyle.textTransform as any,
                    }}
                  >
                    Il veloce coniglio arcobaleno sorridente.
                  </p>
                </div>
            </fieldset>

            {/* Story Content */}
            <fieldset className="space-y-4">
                <div>
                <label htmlFor="themes" className="block text-sm font-medium text-gray-700 mb-1">Temi Principali</label>
                <input type="text" name="themes" id="themes" value={data.themes} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                <label htmlFor="otherElements" className="block text-sm font-medium text-gray-700 mb-1">Elementi Chiave</label>
                <textarea name="otherElements" id="otherElements" value={data.otherElements} onChange={handleChange} rows={3} className={inputClasses}></textarea>
                </div>
            </fieldset>

            {data.referenceImageUrls.style && data.referenceImageUrls.character && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Immagine Stile</span>
                        <img src={data.referenceImageUrls.style} alt="Reference for style" className="w-full h-auto rounded-md border border-gray-300" />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Immagine Personaggio</span>
                        <img src={data.referenceImageUrls.character} alt="Reference for character" className="w-full h-auto rounded-md border border-gray-300" />
                    </div>
                </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">
              Annulla
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">
              Salva Modifiche
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetadataEditorModal;