import { useState, useCallback } from 'react';
import { generateStoryPages } from '../services/geminiService';
import { PromptData, StoryPage, StoryProject } from '../types';
import { formatTextWithLineBreaks } from '../utils/textUtils';

const useStoryGenerator = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    const generateStory = useCallback(async (promptData: PromptData): Promise<StoryProject | null> => {
        setIsLoading(true);
        setError(null);
        setProgressMessage('Sto scrivendo la tua storia...');
        
        try {
            const storyTextPages = await generateStoryPages(promptData);
            
            setProgressMessage('Struttura della storia creata. Preparo l\'editor...');

            const pages: StoryPage[] = storyTextPages.map((pageData, i) => ({
                text: formatTextWithLineBreaks(pageData.text),
                imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent pixel
                imagePrompt: pageData.image_prompt,
                finalImagePrompt: '',
                imageStatus: 'pending',
                imageError: null,
                textAlign: i === 0 ? 'center' : undefined,
            }));

            const newProject: StoryProject = {
                promptData,
                pages,
                createdAt: new Date().toISOString(),
                version: '1.0.0'
            };

            setIsLoading(false);
            setProgressMessage('Storia pronta per la modifica!');
            return newProject;

        } catch (err) {
            console.error('Error generating story text:', err);
            const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.';
            setError(`Fallimento nella creazione della storia: ${errorMessage}`);
            setIsLoading(false);
            return null;
        }
    }, []);

    return { generateStory, isLoading, progressMessage, error, clearError };
};

export default useStoryGenerator;