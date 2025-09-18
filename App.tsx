import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import PromptWizard from './components/PromptWizard';
import StoryEditor from './components/StoryEditor';
import LoadingOverlay from './components/LoadingOverlay';
import useStoryGenerator from './hooks/useStoryGenerator';
import { loadProject } from './services/projectService';
import { PromptData, StoryProject } from './types';

type AppState = 'welcome' | 'wizard' | 'generating' | 'editing';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [storyProject, setStoryProject] = useState<StoryProject | null>(null);
  
  const { generateStory, isLoading, progressMessage, error, clearError } = useStoryGenerator();

  const handleStart = () => {
    setAppState('wizard');
  };

  const handleLoad = async (file: File) => {
    try {
      const project = await loadProject(file);
      setStoryProject(project);
      setAppState('editing');
    } catch (err) {
      console.error("Failed to load project:", err);
      const userMessage = err instanceof Error && (err.message.includes("versione non compatibile") || err.message.includes("corrotto") || err.message.includes("non valido"))
        ? err.message
        : "Impossibile caricare il file. Potrebbe essere corrotto o provenire da una versione non compatibile dell'applicazione.";
      alert(userMessage);
      throw err; // Re-throw to signal failure
    }
  };

  const handleGenerate = async (promptData: PromptData) => {
    setAppState('generating');
    try {
      const newStory = await generateStory(promptData);
      if (newStory) {
        setStoryProject(newStory);
        setAppState('editing');
      } else {
        // Error is handled by the hook and displayed in LoadingOverlay
        setTimeout(() => {
          setAppState('wizard');
          clearError();
        }, 5000); // Go back to wizard after showing error
      }
    } catch (e) {
        // This catch is for unexpected errors during the process setup
        console.error("Error during story generation process:", e);
        setAppState('wizard'); // Go back to wizard
    }
  };

  const handleBackToWelcome = () => {
    setStoryProject(null);
    setAppState('welcome');
  };

  const renderContent = () => {
    switch (appState) {
      case 'welcome':
        return <WelcomeScreen onStart={handleStart} onLoad={handleLoad} />;
      case 'wizard':
        return <PromptWizard onSubmit={handleGenerate} />;
      case 'generating':
        return <LoadingOverlay message={progressMessage} error={error} />;
      case 'editing':
        return storyProject && <StoryEditor project={storyProject} onBack={handleBackToWelcome} />;
      default:
        return null;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {renderContent()}
    </main>
  );
};

export default App;
