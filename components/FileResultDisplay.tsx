import React, { useState } from 'react';
import type { ProcessedFile, InvoiceData } from '../types';
import { ResultsDisplay } from './ResultsDisplay';
import { IconLoader, IconAlertTriangle, IconCheckCircle, IconChevronDown, IconFile } from './Icons';

interface FileResultDisplayProps {
  processedFile: ProcessedFile;
  onDataUpdate: (updatedData: InvoiceData) => void;
}

export const FileResultDisplay: React.FC<FileResultDisplayProps> = ({ processedFile, onDataUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(processedFile.status !== 'success');
  
  React.useEffect(() => {
    // Automatically expand successful results once they are processed
    if (processedFile.status === 'success') {
      setIsExpanded(true);
    }
  }, [processedFile.status]);

  const getStatusIcon = () => {
    switch (processedFile.status) {
      case 'loading':
        return <IconLoader className="h-6 w-6 text-primary animate-spin flex-shrink-0" />;
      case 'success':
        return <IconCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />;
      case 'error':
        return <IconAlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />;
      case 'queue':
      default:
        return <IconFile className="h-6 w-6 text-slate-400 flex-shrink-0" />;
    }
  };
  
  const getStatusText = () => {
    switch (processedFile.status) {
      case 'loading':
        return 'Obrađujem...';
      case 'success':
        return 'Uspješno';
      case 'error':
        return 'Greška';
      case 'queue':
      default:
        return 'Na čekanju';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300">
      <button 
        className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100 focus:outline-none"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`content-${processedFile.id}`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {getStatusIcon()}
          <span className="font-medium text-slate-700 truncate" title={processedFile.file.name}>{processedFile.file.name}</span>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="text-sm font-semibold text-slate-500 hidden sm:block">{getStatusText()}</span>
          <IconChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div id={`content-${processedFile.id}`} className="p-0 sm:p-6 bg-white">
          {processedFile.status === 'success' && processedFile.data && (
            <ResultsDisplay 
              initialData={processedFile.data} 
              onDataUpdate={onDataUpdate} 
              originalPdfFile={processedFile.file} 
            />
          )}
          {processedFile.status === 'error' && (
            <div className="flex items-start space-x-3 text-red-800 bg-red-50 p-4 rounded-b-2xl sm:rounded-lg">
                <IconAlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">Došlo je do greške</p>
                    <p className="text-sm">{processedFile.error}</p>
                </div>
            </div>
          )}
          {(processedFile.status === 'loading' || processedFile.status === 'queue') && (
             <div className="text-center p-8 flex flex-col items-center justify-center">
                <IconLoader className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-md font-semibold text-slate-600">{getStatusText()}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};