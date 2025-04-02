import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import WellLogViewer from './components/WellLogViewer';
import { LASFile } from './types/LASTypes';

const App: React.FC = () => {
  const [lasFile, setLasFile] = useState<LASFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-xl font-bold">LAS Well Log Viewer</h1>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {!lasFile ? (
          <FileUploader 
            onFileLoaded={setLasFile} 
            onError={setError} 
          />
        ) : (
          <div>
            <button 
              onClick={() => setLasFile(null)}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              ← Load a different file
            </button>
            <WellLogViewer lasFile={lasFile} />
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 rounded text-sm"
            >
              Dismiss
            </button>
          </div>
        )}
      </main>

      <footer className="container mx-auto py-4 px-4 text-center text-gray-500 text-sm">
        <p>LAS Viewer - A simple well log data viewer tool</p>
      </footer>
    </div>
  );
};

export default App; 