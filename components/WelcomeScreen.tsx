import React, { useRef } from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface WelcomeScreenProps {
  onStart: () => void;
  onLoad: (file: File) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoad(file);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="relative mb-6">
        <BookOpenIcon className="h-24 w-24 text-indigo-500" />
        <SparklesIcon className="absolute -top-2 -right-4 h-10 w-10 text-amber-400" />
      </div>
      <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
        AI Cantastorie
      </h1>
      <p className="max-w-2xl text-lg text-gray-600 mb-8">
        Crea storie incantevoli e personalizzate per bambini. Fornisci un tema, fai riferimento al tuo stile artistico e ai tuoi personaggi preferiti e guarda come l'IA dà vita al tuo racconto unico.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onStart}
          className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
        >
          Inizia a Creare la Tua Storia
        </button>
        <button
          onClick={handleLoadClick}
          className="px-8 py-4 bg-gray-700 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-75 transition-transform transform hover:scale-105"
        >
          Carica Storia Esistente (.tl4kb)
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".tl4kb"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default WelcomeScreen;