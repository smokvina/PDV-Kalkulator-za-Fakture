import React, { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { IconUpload, IconFile, IconAlertTriangle } from './Icons';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileCount, setFileCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    setErrorMessage(null); // Reset error on new action
    if (files && files.length > 0) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
      const acceptedFiles = Array.from(files).filter(file => 
        allowedTypes.includes(file.type.toLowerCase())
      );

      if (acceptedFiles.length > 0) {
        setFileCount(acceptedFiles.length);
        onFileSelect(acceptedFiles);
        if (acceptedFiles.length < files.length) {
          const skippedCount = files.length - acceptedFiles.length;
          setErrorMessage(`${skippedCount} datoteka je preskočeno jer nisu podržanog formata (PDF, JPG, PNG, HEIC).`);
        }
      } else {
        setErrorMessage("Odabrane datoteke nisu podržanog formata. Molimo odaberite samo PDF, JPG, PNG ili HEIC datoteke.");
        setFileCount(0);
      }
    }
  }, [onFileSelect]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow selecting the same file(s) again
    e.target.value = '';
  };

  const borderStyle = isDragging 
    ? 'border-primary' 
    : 'border-border';
  
  const containerClasses = `relative group flex flex-col items-center justify-center w-full p-8 text-center bg-slate-50 dark:bg-card rounded-xl border-2 border-dashed ${borderStyle} transition-colors duration-300 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/80'}`;

  return (
    <div className="w-full">
      <div 
        className={containerClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
          onChange={handleFileChange}
          disabled={disabled}
          multiple
        />
        <label htmlFor="file-upload" className={`w-full h-full flex flex-col items-center justify-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <div className="mb-4 text-text-secondary group-hover:text-primary transition-colors">
              <IconUpload className="w-12 h-12" />
          </div>
          {fileCount > 0 ? (
               <div className="flex items-center space-x-2 bg-slate-200 text-text dark:bg-slate-700 dark:text-text px-4 py-2 rounded-lg">
                  <IconFile className="h-5 w-5"/>
                  <span className="font-medium">Odabrano: {fileCount} datoteka</span>
              </div>
          ) : (
              <>
                  <p className="text-lg font-semibold text-text">Povucite i ispustite datoteke ovdje</p>
                  <p className="text-text-secondary">ili kliknite za odabir datoteka</p>
                  <p className="text-xs text-text-secondary mt-2">Podržani formati: PDF, JPG, PNG, HEIC</p>
              </>
          )}
        </label>
      </div>
      {errorMessage && (
        <div className="mt-3 flex items-start text-sm text-red-600 dark:text-red-400" role="alert">
            <IconAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};