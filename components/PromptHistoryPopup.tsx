import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface PromptHistoryPopupProps {
  history: string[];
}

const PromptHistoryPopup: React.FC<PromptHistoryPopupProps> = ({ history }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = history
      .map((prompt, index) => `--- Prompt ${index + 1} ---\n${prompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-8 right-0 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-20 p-3 animate-fade-in-fast">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-gray-800">Cronologia Prompt</h4>
        <button
          onClick={handleCopy}
          className="p-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          title="Copia cronologia"
        >
          {copied ? <span className="text-xs">Copiato!</span> : <ClipboardIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto pr-2 space-y-3 text-xs text-gray-600">
        {history.length > 0 ? (
          history.map((prompt, index) => (
            <div key={index} className="border-b border-gray-100 pb-2 last:border-b-0">
              <span className="font-bold text-gray-500 mr-2">{index + 1}.</span>
              {prompt}
            </div>
          ))
        ) : (
          <p className="text-center italic text-gray-400 py-4">Nessuna cronologia disponibile.</p>
        )}
      </div>
    </div>
  );
};

export default PromptHistoryPopup;
