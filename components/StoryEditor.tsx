import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StoryProject, StoryPage as StoryPageType, PromptData } from '../types';
import StoryPage from './StoryPage';
import ExportControls from './ExportControls';
import StorybookPreview from './StorybookPreview';
import MetadataEditorModal from './MetadataEditorModal';
import { EditIcon } from './icons/EditIcon';
import { EyeIcon } from './icons/EyeIcon';
import { generatePageImage } from '../services/geminiService';
import { stripHtml } from '../utils/textUtils';

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
    const isGenerationCancelled = useRef(false);

    const updatedProject: StoryProject = { ...project, pages, promptData };

    useEffect(() => {
        isGenerationCancelled.current = false; // Reset on new project

        const pagesWithPrompts = project.pages.map((page, i) => {
            if (page.finalImagePrompt) {
                return page;
            }
            const isCover = i === 0;
            const finalImagePrompt = isCover
                ? `Copertina del libro per bambini intitolato "${stripHtml(page.text)}". Stile: ${project.promptData.bookStyle}.`
                : `${page.imagePrompt}. Stile: ${project.promptData.bookStyle}.`;
            return { ...page, finalImagePrompt };
        });
        
        setPages(pagesWithPrompts);
        setPromptData(project.promptData);
        
        // Start background image generation only if opted-in
        if (project.promptData.autoGenerateImages ?? true) {
            const generateImagesInBackground = async () => {
                let generatedPagesSoFar = [...pagesWithPrompts];

                for (let i = 0; i < generatedPagesSoFar.length; i++) {
                    if (isGenerationCancelled.current) {
                        console.log("Background image generation has been cancelled.");
                        break;
                    }

                    const pageToProcess = generatedPagesSoFar[i];

                    if (pageToProcess?.imageStatus === 'pending') {
                        try {
                            // Update UI to show 'generating' status for the current page
                            setPages(prevPages => prevPages.map((p, idx) => 
                                i === idx ? { ...p, imageStatus: 'generating' } : p
                            ));
                            
                            // For subsequent pages, use the previously generated image for consistency
                            const previousImageUrl = i > 0 ? generatedPagesSoFar[i-1].imageUrl : null;

                            const newImageUrl = await generatePageImage(pageToProcess.finalImagePrompt!, promptData, previousImageUrl);

                            // Update the local array for the next iteration
                            generatedPagesSoFar[i] = { 
                                ...pageToProcess, 
                                imageUrl: newImageUrl, 
                                imageStatus: 'done', 
                                imageError: null 
                            };
                            
                            // Update the main state with the final result for this page
                            setPages(prevPages => prevPages.map((p, idx) =>
                                i === idx ? generatedPagesSoFar[i] : p
                            ));

                            // A longer delay as image editing can be slower
                            if (i < generatedPagesSoFar.length - 1) {
                                await delay(10000); 
                            }
                        } catch (err) {
                            console.error(`Failed to generate image for page ${i + 1}:`, err);
                            const errorMessage = err instanceof Error ? err.message : String(err);
                            let displayError = "Non è stato possibile generare l'immagine per questa pagina.";
                            if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
                               displayError = "Limite richieste raggiunto. La generazione automatica è in pausa. Puoi rigenerare manualmente più tardi.";
                               isGenerationCancelled.current = true;
                            }
                            
                            setPages(prevPages => prevPages.map((p, idx) =>
                                i === idx ? { ...p, imageStatus: 'error', imageError: displayError } : p
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
        setPages(currentPages =>
            currentPages.map((page, i) => {
                if (i === index && page.imageStatus === 'generating') {
                    // FIX: Use double quotes to wrap string containing a single quote to prevent a syntax error.
                    return { ...page, imageStatus: 'pending', imageError: "Generazione annullata dall'utente." };
                }
                return page;
            })
        );
    }, []);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700"
                >
                    &larr; Torna alla Schermata Iniziale
                </button>
                <div className="flex gap-2">
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
                        <EyeIcon className="w-5 h-5" /> Anteprima Libro
                    </button>
                </div>
            </div>

            <h1 className="text-4xl font-bold text-center mb-4">{stripHtml(pages[0]?.text) || 'La Tua Storia'}</h1>
            <p className="text-center text-gray-500 mb-8">
                Modifica il testo e rigenera le immagini come preferisci. Le immagini verranno generate in background.
            </p>

            <div className="space-y-8">
                {pages.map((page, index) => (
                    <StoryPage
                        key={`${project.createdAt}-${index}`}
                        page={page}
                        index={index}
                        isCover={index === 0}
                        onUpdate={(updatedPage) => handlePageUpdate(index, updatedPage)}
                        promptData={promptData}
                        previousPageText={index > 0 ? pages[index - 1].text : null}
                        previousPageImageUrl={index > 0 ? pages[index-1].imageUrl : null}
                        onCancelImageGeneration={handleCancelImageGeneration}
                    />
                ))}
            </div>

            <ExportControls project={updatedProject} />

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