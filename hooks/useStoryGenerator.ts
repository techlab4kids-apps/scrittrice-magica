import { useState, useCallback } from 'react';
import { generateStoryPages, generatePromptFromText } from '../services/geminiService';
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
        
        try {
            let storyPagesData: { text: string; image_prompt: string }[] = [];

            if (promptData.storyInputMode === 'custom') {
                setProgressMessage('Sto analizzando il tuo testo...');
                const customPagesText = (promptData.customText || '').split(/\n\s*\n+/).filter(p => p.trim() !== '');

                if (customPagesText.length === 0) {
                    throw new Error("Il testo fornito è vuoto o non è stato possibile suddividerlo in pagine.");
                }

                // Add title as the first page's text
                storyPagesData.push({
                    text: promptData.customTitle || "Senza Titolo",
                    image_prompt: '' // Placeholder, will be generated next
                });

                // Add story content pages
                customPagesText.forEach(text => {
                    storyPagesData.push({ text, image_prompt: '' });
                });

                setProgressMessage('Sto creando i prompt per le immagini...');
                // Generate image prompts for each page based on its text
                for (let i = 0; i < storyPagesData.length; i++) {
                    const pageText = storyPagesData[i].text;
                    // For the title, we can create a more generic prompt
                    const promptText = i === 0 ? `Una bella copertina per un libro intitolato: "${pageText}"` : pageText;
                    storyPagesData[i].image_prompt = await generatePromptFromText(promptText);
                }

            } else {
                setProgressMessage('Sto scrivendo la tua storia...');
                storyPagesData = await generateStoryPages(promptData);
            }
            
            setProgressMessage('Struttura della storia creata. Preparo l\'editor...');

            const pages: StoryPage[] = storyPagesData.map((pageData, i) => ({
                text: formatTextWithLineBreaks(pageData.text),
                imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent pixel
                imagePrompt: pageData.image_prompt,
                imagePromptHistory: [pageData.image_prompt], // Initialize history
                imageStatus: 'pending',
                imageError: null,
                textAlign: i === 0 ? 'center' : 'left',
            }));

            const newProject: StoryProject = {
                promptData,
                pages,
                createdAt: new Date().toISOString(),
                version: '1.1.0'
            };

            setIsLoading(false);
            setProgressMessage('Storia pronta per la modifica!');
            return newProject;

        } catch (err) {
            console.error('Error generating story:', err);
            const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.';
            setError(`Fallimento nella creazione della storia: ${errorMessage}`);
            setIsLoading(false);
            return null;
        }
    }, []);

    return { generateStory, isLoading, progressMessage, error, clearError };
};

export default useStoryGenerator;
