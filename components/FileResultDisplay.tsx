import React, { useState } from 'react';
import type { ProcessedFile, InvoiceData } from '../types';
import { ResultsDisplay } from './ResultsDisplay';
import { IconLoader, IconAlertTriangle, IconCheckCircle, IconChevronDown, IconFile } from './Icons';

interface FileResultDisplayProps {
  processedFile: ProcessedFile;
  onDataUpdate: (updatedData: InvoiceData) => void;
  onPrintSingle: () => void;
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


export const FileResultDisplay: React.FC<FileResultDisplayProps> = ({ processedFile, onDataUpdate, onPrintSingle }) => {
  const [isExpanded, setIsExpanded] = useState(processedFile.status !== 'success');
  
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
        <div id={`content-${processedFile.id}`} className="bg-white">
          {processedFile.status === 'success' && processedFile.data && (
            <div className="p-4 sm:p-6">
              <ResultsDisplay 
                initialData={processedFile.data} 
                onDataUpdate={onDataUpdate} 
                originalPdfFile={processedFile.file} 
                onPrint={onPrintSingle}
              />
            </div>
          )}
          {processedFile.status === 'error' && (
            <div className="p-4 sm:p-6">
              <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3 text-red-800">
                      <IconAlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                          <h4 className="font-bold text-lg text-red-900">Obrada nije uspjela</h4>
                          
                          <div className="mt-2 text-sm text-red-900 bg-red-100 p-3 rounded-md">
                              <p className="font-semibold">Detalji greške:</p>
                              <p className="font-mono break-words text-xs">{processedFile.error}</p>
                          </div>

                          <div className="mt-4">
                              <p className="font-semibold text-red-900">Što možete pokušati?</p>
                              <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-red-800">
                                  {getErrorSuggestions(processedFile.error).map((suggestion, index) => (
                                      <li key={index}>{suggestion}</li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                  </div>
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