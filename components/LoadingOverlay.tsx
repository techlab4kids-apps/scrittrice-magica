import React from 'react';

interface LoadingOverlayProps {
  message: string;
  error?: string | null;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, error }) => {
  let displayError = error;
  if (error && (error.includes("RESOURCE_EXHAUSTED") || error.includes("429"))) {
      displayError = "Generazione fallita. Hai raggiunto il limite di richieste per oggi. Riprova più tardi o controlla il tuo piano di utilizzo.";
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50 text-white">
      {!displayError ? (
        <>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-400 mb-6"></div>
          <h2 className="text-2xl font-semibold mb-2">Sto Tessendo il Tuo Racconto...</h2>
          <p className="text-lg text-gray-300">{message}</p>
        </>
      ) : (
        <div className="text-center p-8 bg-red-800 bg-opacity-50 rounded-lg max-w-lg">
           <h2 className="text-2xl font-semibold mb-2 text-red-200">Oh no! Qualcosa è andato storto.</h2>
           <p className="text-lg text-red-300">{displayError}</p>
           <p className="text-sm mt-4 text-gray-400">(L'avviso scomparirà a breve)</p>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;
