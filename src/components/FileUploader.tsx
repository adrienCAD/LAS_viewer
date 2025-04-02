import React, { useState, useRef } from 'react';
import { LASFile } from '../types/LASTypes';
import { parseLASFile } from '../utils/lasParser';

interface FileUploaderProps {
  onFileLoaded: (file: LASFile) => void;
  onError: (error: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length) {
      loadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFile(e.target.files[0]);
    }
  };

  const loadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.las')) {
      onError('Please select a valid .LAS file');
      return;
    }

    setIsLoading(true);
    try {
      const fileContent = await file.text();
      console.log("File loaded, first 100 chars:", fileContent.substring(0, 100));
      const parsedFile = parseLASFile(fileContent, file.name);
      onFileLoaded(parsedFile);
    } catch (error) {
      console.error('Error parsing LAS file:', error);
      onError('Failed to parse the LAS file. Please make sure it is a valid LAS format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Sample file loader - using direct fetch from the downloads folder
  const loadSampleFile = async () => {
    setIsLoading(true);
    try {
      // Try to load from multiple potential locations
      let response;
      try {
        response = await fetch('/downloads/D5RL-00187_University of  Utah_ME-ESW1_Run1_DSI Sonic.las');
        if (!response.ok) throw new Error('Not found at /downloads/');
      } catch (e) {
        try {
          response = await fetch('./downloads/D5RL-00187_University of  Utah_ME-ESW1_Run1_DSI Sonic.las');
          if (!response.ok) throw new Error('Not found at ./downloads/');
        } catch (e2) {
          response = await fetch('../downloads/D5RL-00187_University of  Utah_ME-ESW1_Run1_DSI Sonic.las');
          if (!response.ok) throw new Error('Not found at ../downloads/');
        }
      }
      
      const fileContent = await response.text();
      console.log("Successfully loaded sample file, first 100 chars:", fileContent.substring(0, 100));
      const parsedFile = parseLASFile(fileContent, 'D5RL-00187_University of  Utah_ME-ESW1_Run1_DSI Sonic.las');
      onFileLoaded(parsedFile);
    } catch (error) {
      console.error('Error loading sample file:', error);
      onError(`Failed to load the sample file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="well-log-container">
      <h2 className="text-xl font-semibold mb-4">Load a LAS File</h2>
      
      <div
        className={`file-drop-area ${isDragging ? 'border-blue-500 bg-blue-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".las"
          className="hidden"
        />

        {isLoading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop your .LAS file here, or click to select a file
            </p>
            <p className="mt-1 text-xs text-gray-500">Only .LAS files are supported</p>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <span className="text-sm text-gray-500">or</span>
        <button
          className="ml-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          onClick={loadSampleFile}
          disabled={isLoading}
        >
          load the sample file
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600 mb-2">Still having trouble? Try this:</p>
        <p className="text-xs text-gray-500 mb-2">Find the LAS file in your local system (in downloads folder) and select it directly:</p>
        <input
          type="file"
          onChange={handleFileSelect}
          accept=".las"
          className="block w-full text-sm text-gray-500 bg-gray-100 rounded border border-gray-300 cursor-pointer focus:outline-none mx-auto max-w-xs"
        />
      </div>
    </div>
  );
};

export default FileUploader; 