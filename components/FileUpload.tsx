import React, { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { IconUpload, IconFile } from './Icons';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileCount, setFileCount] = useState<number>(0);

  const handleFiles = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
      const acceptedFiles = Array.from(files).filter(file => 
        allowedTypes.includes(file.type.toLowerCase())
      );

      if (acceptedFiles.length > 0) {
        setFileCount(acceptedFiles.length);
        onFileSelect(acceptedFiles);
        if (acceptedFiles.length < files.length) {
          alert("Neke datoteke su preskočene jer nisu podržanog formata (PDF, JPG, PNG, HEIC).");
        }
      } else {
        alert("Molimo odaberite samo PDF, JPG, PNG ili HEIC datoteke.");
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
    : 'border-slate-300';
  
  const containerClasses = `relative group flex flex-col items-center justify-center w-full p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed ${borderStyle} transition-colors duration-300 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/80'}`;

  return (
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
        <div className="mb-4 text-slate-400 group-hover:text-primary transition-colors">
            <IconUpload className="w-12 h-12" />
        </div>
        {fileCount > 0 ? (
             <div className="flex items-center space-x-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg">
                <IconFile className="h-5 w-5"/>
                <span className="font-medium">Odabrano: {fileCount} datoteka</span>
            </div>
        ) : (
            <>
                <p className="text-lg font-semibold text-slate-700">Povucite i ispustite datoteke ovdje</p>
                <p className="text-slate-500">ili kliknite za odabir datoteka</p>
                <p className="text-xs text-slate-400 mt-2">Podržani formati: PDF, JPG, PNG, HEIC</p>
            </>
        )}
      </label>
    </div>
  );
};