import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FileUpload } from './components/FileUpload';
import { FileResultDisplay } from './components/FileResultDisplay';
import { ReportContent } from './components/ReportContent';
import { INVOICE_SYSTEM_PROMPT, INVOICE_SCHEMA } from './constants';
import type { InvoiceData, ProcessedFile } from './types';
import { IconBook, IconDownload, IconPrinter } from './components/Icons';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingCombinedPdf, setIsGeneratingCombinedPdf] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);


  const handleFileSelection = useCallback((files: File[]) => {
    const newFiles: ProcessedFile[] = files.map(file => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      data: null,
      status: 'queue',
      error: null,
    }));
    setProcessedFiles(prevFiles => {
      const existingIds = new Set(prevFiles.map(f => f.id));
      const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id));
      return [...prevFiles, ...uniqueNewFiles];
    });
  }, []);
  
  const parseSingleInvoice = useCallback(async (fileToProcess: ProcessedFile) => {
    if (!process.env.API_KEY) {
      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'error', error: "API ključ nije postavljen. Molimo postavite API_KEY u varijablama okruženja." } : f));
      return;
    }

    setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'loading' } : f));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Pdf = await fileToBase64(fileToProcess.file);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { text: INVOICE_SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Pdf,
                },
              },
              { text: "Molim te parsiraj ovu fakturu prema sistemskim uputama." }
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: INVOICE_SCHEMA,
        },
      });

      const parsedJson = JSON.parse(response.text);
      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'success', data: parsedJson as InvoiceData } : f));

    } catch (e) {
      console.error(e);
      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'error', error: "Došlo je do pogreške prilikom obrade fakture. Provjerite je li datoteka ispravna i pokušajte ponovno. Greška: " + (e as Error).message } : f));
    }
  }, []);

  useEffect(() => {
    const nextFile = processedFiles.find(f => f.status === 'queue');
    if (nextFile && !isProcessing) {
        setIsProcessing(true);
        parseSingleInvoice(nextFile).finally(() => {
            setIsProcessing(false);
        });
    }
  }, [processedFiles, isProcessing, parseSingleInvoice]);

  // Effect to handle the printing process reliably
  useEffect(() => {
    if (isPrinting) {
      // window.print() is a blocking operation.
      // The code below will execute after the print dialog is closed.
      window.print();
      setIsPrinting(false);
    }
  }, [isPrinting]);

  const handleDataUpdate = (fileId: string, updatedData: InvoiceData) => {
    setProcessedFiles(prevFiles => 
      prevFiles.map(pf => pf.id === fileId ? { ...pf, data: updatedData } : pf)
    );
  };
  
  const handleClearAll = () => {
    setProcessedFiles([]);
  };
  
  const handleGenerateCombinedPdf = async () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return;

    setIsGeneratingCombinedPdf(true);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        for (let i = 0; i < successfulFiles.length; i++) {
            const file = successfulFiles[i];
            
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '210mm'; 
            document.body.appendChild(container);

            const root = ReactDOM.createRoot(container);
            root.render(
                <React.StrictMode>
                    <ReportContent data={file.data!} originalPdfFile={file.file} />
                </React.StrictMode>
            );
            
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(container, { scale: 2, useCORS: true });
            
            root.unmount();
            document.body.removeChild(container);
            
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        }

        pdf.save(`svi-izvjestaji-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error("Greška pri generiranju kombiniranog PDF-a:", error);
        alert("Došlo je do greške pri generiranju PDF-a. Molimo pokušajte ponovno.");
    } finally {
        setIsGeneratingCombinedPdf(false);
    }
  };

  const handlePrintAll = () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return;
    
    // Set isPrinting to true, which will trigger the useEffect hook
    setIsPrinting(true);
  };
  
  const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);

  return (
    <>
      {isPrinting && (
         <div className="print-container">
            {successfulFiles.map(file => (
              <div key={file.id} className="printable-page">
                <ReportContent data={file.data!} originalPdfFile={file.file} />
              </div>
            ))}
        </div>
      )}
      <div className={`min-h-screen bg-slate-50 font-sans ${isPrinting ? 'hidden' : ''}`}>
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <IconBook className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">PDV Kalkulator za Fakture</h1>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-700 mb-1">Učitajte PDF Fakture</h2>
              <p className="text-slate-500 mb-6">Sustav će automatski izvući podatke za svaku datoteku koristeći Gemini AI.</p>
              <FileUpload onFileSelect={handleFileSelection} disabled={isProcessing || isGeneratingCombinedPdf} />
            </div>

            {processedFiles.length > 0 && (
              <div className="mt-8 space-y-4">
                 <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-semibold text-slate-700">Rezultati obrade</h3>
                   <div className="flex items-center space-x-2">
                    {successfulFiles.length > 1 && (
                      <>
                        <button
                          onClick={handleGenerateCombinedPdf}
                          className="flex items-center text-sm font-semibold bg-white border border-primary text-primary px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isProcessing || isGeneratingCombinedPdf}
                          title="Preuzmi sve kao jedan PDF dokument"
                        >
                          <IconDownload className="w-4 h-4 mr-1.5" />
                          <span>{isGeneratingCombinedPdf ? 'Generiram...' : 'Preuzmi sve (PDF)'}</span>
                        </button>
                         <button
                          onClick={handlePrintAll}
                          className="flex items-center text-sm font-semibold bg-white border border-secondary text-secondary px-3 py-1.5 rounded-lg shadow-sm hover:bg-secondary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isProcessing || isGeneratingCombinedPdf}
                          title="Ispiši sve izvještaje"
                        >
                          <IconPrinter className="w-4 h-4 mr-1.5" />
                          <span>Ispiši sve</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleClearAll}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      disabled={isProcessing || isGeneratingCombinedPdf}
                    >
                      Očisti sve
                    </button>
                  </div>
                </div>
                {processedFiles.map(pf => (
                  <FileResultDisplay
                    key={pf.id}
                    processedFile={pf}
                    onDataUpdate={(updatedData) => handleDataUpdate(pf.id, updatedData)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
         <footer className="text-center py-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} PDV Kalkulator. Pokreće Gemini AI.</p>
        </footer>
      </div>
    </>
  );
};

export default App;