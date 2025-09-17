import React from 'react';
import { StoryProject } from '../types';
import { exportToPdf } from '../services/exportService';
import { saveProject } from '../services/projectService';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface ExportControlsProps {
  project: StoryProject;
}

const ExportControls: React.FC<ExportControlsProps> = ({ project }) => {

  const handleExportPdf = () => {
    exportToPdf(project);
  };
  
  const handleSaveProject = () => {
    saveProject(project);
  };

  const handleCopyJson = () => {
    const jsonString = JSON.stringify(project, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => alert('Dati del progetto copiati negli appunti come JSON!'))
      .catch(err => console.error('Failed to copy JSON: ', err));
  };

  return (
    <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-4">Esporta e Salva la Tua Storia</h2>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700 transition-colors"
        >
          <ArrowDownTrayIcon className="w-5 h-5"/> Esporta come PDF
        </button>
        <button
          onClick={handleSaveProject}
          className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition-colors"
        >
          <ArrowDownTrayIcon className="w-5 h-5"/> Salva Progetto (.tl4kb)
        </button>
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700 transition-colors"
        >
          <ClipboardIcon className="w-5 h-5" /> Copia Dati (JSON)
        </button>
      </div>
    </div>
  );
};

export default ExportControls;