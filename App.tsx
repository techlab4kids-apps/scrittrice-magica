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
      const userMessage = err instanceof Error && (err.message.includes("versione non compatibile") || err.message.includes("corrotto"))
        ? err.message
        : "Impossibile caricare il file. Potrebbe essere corrotto o provenire da una versione non compatibile dell'applicazione.";
      alert(userMessage);
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
      case 'wizard':
        return <PromptWizard onSubmit={handleGenerate} />;
      case 'generating':
        return (
          <>
            <PromptWizard onSubmit={handleGenerate} disabled={true} />
            <LoadingOverlay message={progressMessage} error={error} />
          </>
        );
      case 'editing':
        if (storyProject) {
          return <StoryEditor project={storyProject} onBack={handleBackToWelcome} />;
        }
        // Fallback to welcome if no project
        setAppState('welcome');
        return <WelcomeScreen onStart={handleStart} onLoad={handleLoad} />;
      case 'welcome':
      default:
        return <WelcomeScreen onStart={handleStart} onLoad={handleLoad} />;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800">
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;