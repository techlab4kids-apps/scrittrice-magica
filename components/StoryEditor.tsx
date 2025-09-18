import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StoryProject, StoryPage as StoryPageType, PromptData } from '../types';
import StoryPage from './StoryPage';
import StorybookPreview from './StorybookPreview';
import MetadataEditorModal from './MetadataEditorModal';
import { EditIcon } from './icons/EditIcon';
import { EyeIcon } from './icons/EyeIcon';
import { generatePageImage } from '../services/geminiService';
import { stripHtml } from '../utils/textUtils';
import { exportToPdf } from '../services/exportService';
import { saveProject } from '../services/projectService';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// FIX: Define props interface for the StoryEditor component.
interface StoryEditorProps {
    project: StoryProject;
    onBack: () => void;
}

const StoryEditor: React.FC<StoryEditorProps> = ({ project, onBack }) => {
    const [pages, setPages] = useState<StoryPageType[]>(project.pages);
    const [promptData, setPromptData] = useState<PromptData>(project.promptData);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
    const isGenerationCancelled = useRef(false);

    const updatedProject: StoryProject = { ...project, pages, promptData };

    useEffect(() => {
        isGenerationCancelled.current = false; // Reset on new project

        // Initialize pages from the project, ensuring data structure is correct.
        setPages(project.pages);
        setPromptData(project.promptData);
        
        if (project.promptData.autoGenerateImages ?? true) {
            const generateImagesInBackground = async () => {
                let generatedPagesSoFar = [...project.pages];

                for (let i = 0; i < generatedPagesSoFar.length; i++) {
                    if (isGenerationCancelled.current) {
                        console.log("Background image generation has been cancelled.");
                        break;
                    }

                    const pageToProcess = generatedPagesSoFar[i];
                    const currentPrompt = pageToProcess.imagePromptHistory[pageToProcess.imagePromptHistory.length - 1];

                    if (pageToProcess?.imageStatus === 'pending' && currentPrompt) {
                        try {
                            setPages(prevPages => prevPages.map((p, idx) => 
                                i === idx ? { ...p, imageStatus: 'generating' } : p
                            ));
                            
                            const previousPage = i > 0 ? generatedPagesSoFar[i - 1] : null;
                            const previousImageUrl = (previousPage && previousPage.imageStatus === 'done') ? previousPage.imageUrl : null;

                            const { imageUrl: newImageUrl } = await generatePageImage(currentPrompt, promptData, previousImageUrl);

                            generatedPagesSoFar[i] = { 
                                ...pageToProcess, 
                                imageUrl: newImageUrl, 
                                imageStatus: 'done', 
                                imageError: null,
                            };
                            
                            setPages(prevPages => prevPages.map((p, idx) =>
                                i === idx ? generatedPagesSoFar[i] : p
                            ));

                            if (i < generatedPagesSoFar.length - 1) {
                                await delay(10000); 
                            }
                        } catch (err) {
                            console.error(`Failed to generate image for page ${i + 1}:`, err);
                            const errorString = err instanceof Error ? err.message : JSON.stringify(err);
                            let displayError = "Non è stato possibile generare l'immagine per questa pagina.";
                            
                            if (errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429")) {
                               displayError = "Limite richieste raggiunto. La generazione automatica è in pausa. Puoi rigenerare manually più tardi.";
                               isGenerationCancelled.current = true;
                            } else if (errorString.includes("INVALID_ARGUMENT")) {
                                displayError = "L'immagine di riferimento non è valida o è corrotta. La generazione automatica è in pausa.";
                               isGenerationCancelled.current = true;
                            } else if (errorString.includes("pulire il prompt")) {
                                displayError = "Impossibile elaborare il prompt per l'IA. La generazione automatica è in pausa.";
                                isGenerationCancelled.current = true;
                            }
                            
                            const failedPage: StoryPageType = { 
                                ...pageToProcess, 
                                imageStatus: 'error', 
                                imageError: displayError 
                            };

                            generatedPagesSoFar[i] = failedPage;

                            setPages(prevPages => prevPages.map((p, idx) =>
                                i === idx ? failedPage : p
                            ));
                        }
                    }
                }
            };
            generateImagesInBackground();
        }

        return () => {
            isGenerationCancelled.current = true;
        };
    }, [project]);

    const handlePageUpdate = useCallback((index: number, updatedPage: StoryPageType) => {
        setPages(currentPages => 
            currentPages.map((page, i) => (i === index ? updatedPage : page))
        );
    }, []);
    
    const handleMetadataSave = (updatedData: PromptData) => {
        setPromptData(updatedData);
    };

    const handleCancelImageGeneration = useCallback((index: number) => {
        isGenerationCancelled.current = true;
        setPages(currentPages =>
            currentPages.map((page, i) => {
                if (i >= index && (page.imageStatus === 'generating' || page.imageStatus === 'pending')) {
                    return { ...page, imageStatus: 'pending', imageError: "Generazione annullata dall'utente." };
                }
                return page;
            })
        );
    }, []);

    const handleExportPdf = () => exportToPdf(updatedProject);
    const handleSaveProject = () => saveProject(updatedProject);
    const handleCopyJson = () => {
        const jsonString = JSON.stringify(updatedProject, null, 2);
        navigator.clipboard.writeText(jsonString)
            .then(() => alert('Dati del progetto copiati negli appunti come JSON!'))
            .catch(err => console.error('Failed to copy JSON: ', err));
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 flex-wrap">
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700"
                >
                    &larr; Torna alla Schermata Iniziale
                </button>
                <div className="flex gap-2 flex-wrap justify-center">
                    <button
                        onClick={() => setIsEditingMetadata(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700"
                    >
                       <EditIcon className="w-5 h-5"/> Modifica Dati
                    </button>
                    <button
                        onClick={() => setIsPreviewing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow hover:bg-purple-700"
                    >
                        <EyeIcon className="w-5 h-5" /> Anteprima
                    </button>
                     <button
                        onClick={handleExportPdf}
                        className="flex items-center gap-2 justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5"/> PDF
                    </button>
                    <button
                        onClick={handleSaveProject}
                        className="flex items-center gap-2 justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5"/> Salva
                    </button>
                    <button
                        onClick={handleCopyJson}
                        className="flex items-center gap-2 justify-center px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow hover:bg-gray-600"
                    >
                        <ClipboardIcon className="w-5 h-5" /> JSON
                    </button>
                </div>
            </div>

            <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">{stripHtml(pages[0]?.text) || 'La Tua Storia'}</h1>
            <p className="text-center text-gray-500 mb-8">
                Modifica il testo e rigenera le immagini. Puoi trascinare un'immagine su un'altra per usarla come riferimento di stile.
            </p>

            <div className="space-y-8" onDragEnd={() => setDraggedPageIndex(null)}>
                {pages.map((page, index) => {
                    const prevPage = index > 0 ? pages[index - 1] : null;
                    const prevImageUrlForContext = (prevPage && prevPage.imageStatus === 'done') ? prevPage.imageUrl : null;
                    
                    return (
                        <StoryPage
                            key={`${project.createdAt}-${index}`}
                            page={page}
                            index={index}
                            isCover={index === 0}
                            onUpdate={(updatedPage) => handlePageUpdate(index, updatedPage)}
                            promptData={promptData}
                            previousPageText={index > 0 ? pages[index - 1].text : null}
                            previousPageImageUrl={prevImageUrlForContext}
                            onCancelImageGeneration={handleCancelImageGeneration}
                            draggedPageIndex={draggedPageIndex}
                            setDraggedPageIndex={setDraggedPageIndex}
                            allPages={pages}
                        />
                    );
                })}
            </div>

            {isPreviewing && (
                <StorybookPreview 
                    pages={pages} 
                    promptData={promptData} 
                    onClose={() => setIsPreviewing(false)} 
                />
            )}

            {isEditingMetadata && (
                <MetadataEditorModal 
                    initialData={promptData} 
                    onSave={handleMetadataSave} 
                    onClose={() => setIsEditingMetadata(false)} 
                />
            )}
        </div>
    );
};

export default StoryEditor;
