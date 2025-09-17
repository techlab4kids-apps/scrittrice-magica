import React, { useState, useCallback, useEffect } from 'react';
import { StoryPage, PromptData } from '../types';
import { XIcon } from './icons/XIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { WarningIcon } from './icons/WarningIcon';

// Componente per il pannello dell'immagine
const ImagePanel = ({ page }: { page: StoryPage }) => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4 rounded-l-md shadow-inner overflow-hidden">
        <div className="relative w-full h-full">
            <img src={page.imageUrl} alt="Illustrazione" className="w-full h-full object-contain rounded-md"/>
            {page.imageError && (
                <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex flex-col items-center justify-center rounded-md z-10 p-2 text-white text-center">
                    <WarningIcon className="w-8 h-8 mb-2 text-red-300" />
                    <p className="text-xs text-red-200 leading-tight">{page.imageError}</p>
                </div>
            )}
        </div>
    </div>
);

// Componente per il pannello del testo
const TextPanel = ({ page, isCover, promptData }: { page: StoryPage, isCover: boolean, promptData: PromptData }) => {
    const effectiveTextStyle = page.textStyle || promptData.textStyle;
    return (
        <div className="w-full h-full bg-white flex items-center justify-center p-6 md:p-10 rounded-r-md overflow-auto">
            <div 
                className={`text-gray-800 ${isCover ? 'px-4 text-center' : 'px-8'}`}
                style={{
                    textAlign: page.textAlign || (isCover ? 'center' : 'left'),
                    fontFamily: effectiveTextStyle.fontFamily,
                    fontSize: effectiveTextStyle.fontSize,
                    textTransform: effectiveTextStyle.textTransform as any,
                }}
            >
                <div 
                    className={`${isCover ? 'font-bold' : 'leading-relaxed'}`}
                    style={{
                        // Use inline styles from effectiveTextStyle for dynamic font sizes,
                        // but let Tailwind handle weight/leading for simplicity.
                        fontSize: effectiveTextStyle.fontSize,
                    }}
                    dangerouslySetInnerHTML={{ __html: page.text }}
                />
            </div>
        </div>
    );
};


interface StorybookPreviewProps {
  pages: StoryPage[];
  promptData: PromptData;
  onClose: () => void;
}

const StorybookPreview: React.FC<StorybookPreviewProps> = ({ pages, promptData, onClose }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const handleNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1));
  }, [pages.length]);

  const handlePrevPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextPage();
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, onClose]);

  if (!pages || pages.length === 0) return null;
  
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pages.length - 1;
  const activePage = pages[currentPageIndex];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 z-50">
            <XIcon className="w-10 h-10" />
        </button>
        
        <div className="w-full max-w-lg md:max-w-6xl aspect-[4/3] relative" onClick={(e) => e.stopPropagation()}>
           {/* Contenitore del libro */}
           <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-x-2 bg-gray-300 p-2 rounded-lg shadow-2xl">
              {/* Pannello Immagine (Sinistra) */}
              <ImagePanel page={activePage} />
              
              {/* Pannello Testo (Destra) */}
              <TextPanel page={activePage} isCover={isFirstPage} promptData={promptData} />
           </div>
        </div>

        {/* Navigazione */}
        <div className="flex items-center justify-center gap-8 mt-4 w-full max-w-sm md:max-w-5xl">
            <button 
                onClick={handlePrevPage} 
                className="text-white hover:text-gray-300 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                aria-label="Pagina precedente"
                disabled={isFirstPage}
            >
                <ArrowLeftIcon className="w-12 h-12" />
            </button>
            <p className="text-white text-lg font-semibold flex-grow text-center">
                {isFirstPage ? "Copertina" : `Pagina ${currentPageIndex} di ${pages.length - 1}`}
            </p>
             <button 
                onClick={handleNextPage} 
                className="text-white hover:text-gray-300 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                aria-label="Pagina successiva"
                disabled={isLastPage}
            >
                <ArrowRightIcon className="w-12 h-12" />
            </button>
        </div>
    </div>
  );
};

export default StorybookPreview;