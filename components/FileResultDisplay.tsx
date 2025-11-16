import React, { useState } from 'react';
import type { ProcessedFile, InvoiceData } from '../types';
import { ResultsDisplay } from './ResultsDisplay';
import { IconLoader, IconAlertTriangle, IconCheckCircle, IconChevronDown, IconFile, IconCode, IconInfo } from './Icons';

interface FileResultDisplayProps {
  processedFile: ProcessedFile;
  onDataUpdate: (updatedData: InvoiceData) => void;
  onPrintSingle: () => void;
  onGeneratePdvFormsSingle: (file: ProcessedFile) => void;
  isGeneratingPdvFormsSingleId: string | null;
}

// Helper function to generate suggestions based on error message
const getErrorSuggestions = (error: string | null): string[] => {
  if (!error) return [];

  const lowerError = error.toLowerCase();

  // 1. API Key issues
  if (lowerError.includes('api ključ') || lowerError.includes('api key') || lowerError.includes('permission denied')) {
    return [
      "API ključ nije ispravno konfiguriran, nedostaje ili je nevažeći.",
      "Ako ste administrator, provjerite je li API ključ točan i ima li potrebne dozvole.",
      "Kontaktirajte tehničku podršku za pomoć pri postavljanju ključa."
    ];
  }

  // 2. JSON Format / Parsing issues
  if (lowerError.includes('json') || lowerError.includes('parse') || lowerError.includes('unexpected token')) {
    return [
      "AI model nije mogao strukturirati podatke, vjerojatno zbog nestandardnog formata fakture.",
      "Provjerite je li skenirani dokument visoke kvalitete (jasan tekst, bez mrlja).",
      "Pokušajte ponovno. Ponekad drugi pokušaj obrade može uspjeti.",
      "Ako se greška ponavlja, faktura vjerojatno zahtijeva ručni unos podataka."
    ];
  }

  // 3. Network issues
  if (lowerError.includes('mrežom') || lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('timeout')) {
    return [
      "Problem s mrežnom vezom. Provjerite jeste li spojeni na internet.",
      "Osvježite stranicu i pokušajte ponovno kada veza bude stabilna.",
      "Ako koristite VPN ili proxy, pokušajte ih privremeno isključiti jer mogu ometati vezu."
    ];
  }
  
  // 4. PDF File issues
  if (lowerError.includes('datoteka') || lowerError.includes('file') || lowerError.includes('pdf') || lowerError.includes('corrupt')) {
    return [
      "Datoteka je možda oštećena ili u formatu koji se ne može pročitati. Pokušajte je otvoriti na računalu.",
      "Uvjerite se da PDF nije zaštićen lozinkom, jer sustav ne može obrađivati takve datoteke.",
      "Ako je moguće, ponovno preuzmite ili generirajte fakturu iz izvornog sustava (npr. sa stranice dobavljača)."
    ];
  }
  
  // 5. AI Model/Quota issues
  if (lowerError.includes('quota') || lowerError.includes('rate limit') || lowerError.includes('resource exhausted')) {
    return [
        "Dosegnut je limit broja zahtjeva prema AI servisu. Molimo pričekajte nekoliko minuta i pokušajte ponovno.",
        "Ako se problem često ponavlja, kontaktirajte administratora radi provjere statusa pretplate."
    ];
  }

  // Default suggestions for unknown errors
  return [
    "Došlo je do neočekivane pogreške.",
    "Provjerite je li datoteka ispravna, čitljiva i nije zaštićena lozinkom.",
    "Pokušajte ponovno obraditi datoteku.",
    "Ako se problem nastavi, kontaktirajte tehničku podršku s detaljima greške."
  ];
};


export const FileResultDisplay: React.FC<FileResultDisplayProps> = ({ processedFile, onDataUpdate, onPrintSingle, onGeneratePdvFormsSingle, isGeneratingPdvFormsSingleId }) => {
  const [isExpanded, setIsExpanded] = useState(processedFile.status !== 'success');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  React.useEffect(() => {
    // Automatically expand results once they are processed (success or error)
    if (processedFile.status === 'success' || processedFile.status === 'error') {
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

  const fileName = processedFile.data?.meta.source_file || processedFile.file?.name || 'Nepoznata datoteka';

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-lg border border-border overflow-hidden transition-all duration-300">
      <button 
        className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/80 focus:outline-none"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`content-${processedFile.id}`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {getStatusIcon()}
          <span className="font-medium text-text truncate" title={fileName}>{fileName}</span>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="text-sm font-semibold text-text-secondary hidden sm:block">{getStatusText()}</span>
          <IconChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div id={`content-${processedFile.id}`} className="bg-white dark:bg-card">
          {processedFile.status === 'success' && !processedFile.file && (
             <div className="p-4 sm:p-6 border-b border-border">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 rounded-md flex items-start">
                    <IconInfo className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold">Originalna datoteka nije dostupna</h4>
                        <p className="text-sm">Podaci su vraćeni iz prethodne sesije. Za akcije koje zahtijevaju original (npr. 'Kombiniraj sve', 'Spoji originale'), potrebno je ponovno učitati datoteku.</p>
                    </div>
                </div>
            </div>
          )}
          {processedFile.status === 'success' && processedFile.data && (
            <div className="p-4 sm:p-6">
              <ResultsDisplay 
                initialData={processedFile.data} 
                onDataUpdate={onDataUpdate} 
                originalPdfFile={processedFile.file} 
                onPrint={onPrintSingle}
                onGeneratePdvFormsSingle={() => onGeneratePdvFormsSingle(processedFile)}
                isGeneratingPdvFormsSingle={isGeneratingPdvFormsSingleId === processedFile.id}
              />
            </div>
          )}
          {processedFile.status === 'error' && (
            <div className="p-4 sm:p-6">
              <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
                  <div className="flex items-start">
                      <div className="flex-shrink-0">
                          <IconAlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                      <div className="ml-3 flex-1">
                          <h3 className="text-lg font-bold text-red-900 dark:text-red-200">Obrada nije uspjela</h3>
                          <div className="mt-2 text-sm text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-500/20 p-3 rounded-md">
                              <p className="font-semibold">Detalji greške:</p>
                              <p className="font-mono break-words">{processedFile.error}</p>
                          </div>
                          <div className="mt-4">
                              <p className="font-bold text-red-900 dark:text-red-200">Što možete pokušati?</p>
                              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-800 dark:text-red-300">
                                  {getErrorSuggestions(processedFile.error).map((suggestion, index) => (
                                      <li key={index}>{suggestion}</li>
                                  ))}
                              </ul>
                          </div>
                          {processedFile.debugInfo && (
                            <div className="mt-4 pt-4 border-t border-red-300 dark:border-red-400/50">
                              <button
                                onClick={() => setShowDebugInfo(!showDebugInfo)}
                                className="flex items-center text-sm font-semibold text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 focus:outline-none"
                              >
                                <IconCode className="w-4 h-4 mr-1.5" />
                                <span>{showDebugInfo ? 'Sakrij tehničke detalje' : 'Prikaži tehničke detalje'}</span>
                              </button>
                              {showDebugInfo && (
                                <div className="mt-2 text-xs text-red-900 dark:text-red-200 bg-red-200 dark:bg-red-500/20 p-3 rounded-md font-mono">
                                  <p><strong>Vrijeme obrade:</strong> {processedFile.debugInfo.processingTimeMs} ms</p>
                                  <p><strong>Korišteni model:</strong> {processedFile.debugInfo.modelUsed}</p>
                                  <p className="mt-2"><strong>Sirova greška:</strong></p>
                                  <pre className="whitespace-pre-wrap break-all mt-1">{processedFile.debugInfo.rawError}</pre>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                  </div>
              </div>
            </div>
          )}
          {(processedFile.status === 'loading' || processedFile.status === 'queue') && (
             <div className="text-center p-8 flex flex-col items-center justify-center">
                <IconLoader className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-md font-semibold text-text-secondary">{getStatusText()}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
