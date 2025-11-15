import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import heic2any from 'heic2any';
import { FileUpload } from './components/FileUpload';
import { GroupedInvoiceSelector } from './components/GroupedInvoiceSelector';
import { ReportContent } from './components/ReportContent';
import { SummaryReport } from './components/SummaryReport';
import { EmailModal } from './components/EmailModal';
import { INVOICE_SYSTEM_PROMPT, INVOICE_SCHEMA } from './constants';
import type { InvoiceData, ProcessedFile } from './types';
import { IconBook, IconSun, IconMoon } from './components/Icons';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to handle potential HEIC conversion
const prepareFileForApi = async (file: File): Promise<{ file: File; mimeType: string }> => {
  const fileType = file.type.toLowerCase();
  if (fileType === 'image/heic' || fileType === 'image/heif') {
    try {
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });
      const jpegBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
      
      const jpegFile = new File([jpegBlob], `${file.name.split('.').slice(0, -1).join('.')}.jpeg`, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });
      return { file: jpegFile, mimeType: 'image/jpeg' };
    } catch (e) {
      console.error("HEIC conversion error:", e);
      throw new Error("Konverzija HEIC datoteke nije uspjela. Datoteka je možda oštećena.");
    }
  }
  // For PDF, JPG, PNG, no conversion is needed
  return { file, mimeType: file.type };
};


const App: React.FC = () => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingCombinedPdf, setIsGeneratingCombinedPdf] = useState<boolean>(false);
  const [isGeneratingSummaryPdf, setIsGeneratingSummaryPdf] = useState<boolean>(false);
  const [isMergingPdfs, setIsMergingPdfs] = useState<boolean>(false);
  const [isCombiningAll, setIsCombiningAll] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [fileToPrint, setFileToPrint] = useState<ProcessedFile | null>(null);
  const [filesToPrint, setFilesToPrint] = useState<ProcessedFile[] | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check for saved theme in localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (systemPrefersDark) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    // Apply theme class to the root element
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };


  const handleFileSelection = useCallback((files: File[]) => {
    const newFiles: ProcessedFile[] = files.map(file => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      data: null,
      status: 'queue',
      error: null,
      debugInfo: null,
    }));
    setProcessedFiles(prevFiles => {
      const existingIds = new Set(prevFiles.map(f => f.id));
      const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id));
      return [...prevFiles, ...uniqueNewFiles];
    });
  }, []);
  
  const parseSingleInvoice = useCallback(async (fileToProcess: ProcessedFile) => {
    if (!process.env.API_KEY) {
      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'error', error: "API ključ nije postavljen." } : f));
      return;
    }

    setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'loading' } : f));
    
    const startTime = Date.now();
    const modelName = 'gemini-2.5-flash';

    try {
      const { file: finalFile, mimeType } = await prepareFileForApi(fileToProcess.file);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = await fileToBase64(finalFile);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            { text: "Molim te parsiraj ovu fakturu." }
          ]
        },
        config: {
          systemInstruction: INVOICE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: INVOICE_SCHEMA,
        },
      });
      
      let parsedJson;
      try {
        parsedJson = JSON.parse(response.text);
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError, "Original response:", response.text);
        throw new Error("AI model nije vratio ispravan JSON format. To se može dogoditi s kompleksnim ili nejasnim dokumentima.");
      }


      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'success', data: parsedJson as InvoiceData } : f));

    } catch (e) {
      const endTime = Date.now();
      console.error("Greška pri parsiranju fakture:", e);
      let errorMessage = "Došlo je do neočekivane pogreške prilikom obrade.";
       if (e instanceof Error) {
           if (e.message.toLowerCase().includes('network') || e.message.toLowerCase().includes('fetch')) {
               errorMessage = "Problem s mrežnom vezom. Provjerite svoju internet konekciju.";
           } else {
               errorMessage = e.message;
           }
       }
       
      const debugInfo = {
        processingTimeMs: endTime - startTime,
        modelUsed: modelName,
        rawError: e instanceof Error ? e.stack || e.message : String(e),
      };

      setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'error', error: errorMessage, debugInfo } : f));
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
    if (!isPrinting) return;

    const handleAfterPrint = () => {
      setIsPrinting(false);
      setFileToPrint(null);
      setFilesToPrint(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    // Use a minimal timeout to ensure the DOM is ready for printing.
    const timer = setTimeout(() => window.print(), 50);

    // Cleanup function to remove the listener and clear timeout
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);

  const handleDataUpdate = (fileId: string, updatedData: InvoiceData) => {
    setProcessedFiles(prevFiles => 
      prevFiles.map(pf => pf.id === fileId ? { ...pf, data: updatedData } : pf)
    );
  };
  
  const handleClearAll = () => {
    setProcessedFiles([]);
  };
  
  const handleDownloadAllPdf = async () => {
    const filesToGenerate = processedFiles.filter(f => f.status === 'success' && f.data);
    if (filesToGenerate.length === 0) return;

    setIsGeneratingCombinedPdf(true);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        for (let i = 0; i < filesToGenerate.length; i++) {
            const file = filesToGenerate[i];
            
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
            
            await new Promise(resolve => setTimeout(resolve, 300)); // Give some time for rendering

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

   const handleDownloadSummaryPdf = async () => {
        const filesToGenerate = processedFiles.filter(f => f.status === 'success' && f.data);
        if (filesToGenerate.length === 0) return;

        setIsGeneratingSummaryPdf(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '210mm';
            document.body.appendChild(container);

            const root = ReactDOM.createRoot(container);
            root.render(
                <React.StrictMode>
                    <SummaryReport files={filesToGenerate} />
                </React.StrictMode>
            );

            await new Promise(resolve => setTimeout(resolve, 300)); // Give time for rendering

            const canvas = await html2canvas(container, { scale: 2, useCORS: true });

            root.unmount();
            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            
            pdf.save(`zbirni-izvjestaj-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error("Greška pri generiranju zbirnog PDF-a:", error);
            alert("Došlo je do greške pri generiranju zbirnog PDF-a. Molimo pokušajte ponovno.");
        } finally {
            setIsGeneratingSummaryPdf(false);
        }
    };

  const handleMergeAllOriginalPdfs = async () => {
    const filesToMerge = processedFiles.map(f => f.file).filter(f => f.type === 'application/pdf');
    if (filesToMerge.length === 0) {
        alert("Nema PDF datoteka za spajanje. Ova funkcija spaja samo originalne PDF dokumente.");
        return;
    }


    setIsMergingPdfs(true);
    try {
        const mergedPdfDoc = await PDFDocument.create();
        
        for (const file of filesToMerge) {
            const pdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const copiedPages = await mergedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdfDoc.addPage(page);
            });
        }
        
        const mergedPdfBytes = await mergedPdfDoc.save();
        
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `spojeni-originali-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Greška pri spajanju PDF-ova:", error);
        alert("Došlo je do greške pri spajanju PDF-ova. Provjerite jesu li sve datoteke ispravne i da nisu zaštićene lozinkom.");
    } finally {
        setIsMergingPdfs(false);
    }
  };

    const handleCombineAll = async () => {
        const filesToCombine = processedFiles.filter(f => f.status === 'success' && f.data);
        if (filesToCombine.length === 0) return;

        setIsCombiningAll(true);
        try {
            const combinedDoc = await PDFDocument.create();

            for (const processedFile of filesToCombine) {
                // 1. Add Original File Page(s)
                const { file: originalFile, mimeType } = await prepareFileForApi(processedFile.file);

                if (mimeType === 'application/pdf') {
                    const pdfBytes = await originalFile.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                    const copiedPages = await combinedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach(page => combinedDoc.addPage(page));
                } else if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
                    const imgBytes = await originalFile.arrayBuffer();
                    const image = mimeType === 'image/jpeg' 
                        ? await combinedDoc.embedJpg(imgBytes)
                        : await combinedDoc.embedPng(imgBytes);
                    
                    const page = combinedDoc.addPage();
                    const { width, height } = page.getSize();
                    const { width: imgWidth, height: imgHeight } = image;
                    
                    const widthScale = (width - 50) / imgWidth;
                    const heightScale = (height - 50) / imgHeight;
                    const scale = Math.min(widthScale, heightScale, 1);
                    const scaledDims = { width: imgWidth * scale, height: imgHeight * scale };

                    page.drawImage(image, {
                        x: (width - scaledDims.width) / 2,
                        y: (height - scaledDims.height) / 2,
                        width: scaledDims.width,
                        height: scaledDims.height,
                    });
                }

                // 2. Add Report Page
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.width = '210mm';
                document.body.appendChild(container);

                const root = ReactDOM.createRoot(container);
                root.render(
                    <React.StrictMode>
                        <ReportContent data={processedFile.data!} originalPdfFile={processedFile.file} />
                    </React.StrictMode>
                );
                
                await new Promise(resolve => setTimeout(resolve, 300));

                const canvas = await html2canvas(container, { scale: 2, useCORS: true });
                
                root.unmount();
                document.body.removeChild(container);

                const pngBytes = await fetch(canvas.toDataURL('image/png')).then(res => res.arrayBuffer());
                const reportImage = await combinedDoc.embedPng(pngBytes);

                const reportPage = combinedDoc.addPage();
                const { width: pageWidth, height: pageHeight } = reportPage.getSize();
                const { width: reportImgWidth, height: reportImgHeight } = reportImage;

                const reportScale = Math.min(pageWidth / reportImgWidth, pageHeight / reportImgHeight);
                const reportScaled = { width: reportImgWidth * reportScale, height: reportImgHeight * reportScale };

                reportPage.drawImage(reportImage, {
                    x: (pageWidth - reportScaled.width) / 2,
                    y: (pageHeight - reportScaled.height) / 2,
                    width: reportScaled.width,
                    height: reportScaled.height,
                });
            }

            // 3. Save and Download
            const combinedPdfBytes = await combinedDoc.save();
            const blob = new Blob([combinedPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `kombinirano_sve-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Greška pri kombiniranju svih dokumenata:", error);
            alert("Došlo je do greške pri kombiniranju dokumenata.");
        } finally {
            setIsCombiningAll(false);
        }
    };


  const handlePrintAll = () => {
    const files = processedFiles.filter(f => f.status === 'success' && f.data);
    if (files.length === 0) return;
    setFileToPrint(null);
    setFilesToPrint(files);
    setIsPrinting(true);
  };
  
  const handlePrintSingle = (fileId: string) => {
    const file = processedFiles.find(f => f.id === fileId);
    if (file && file.status === 'success' && file.data) {
      setFileToPrint(file);
      setFilesToPrint(null);
      setIsPrinting(true);
    }
  };

  const handleOpenEmailModal = () => setIsEmailModalOpen(true);
  const handleCloseEmailModal = () => setIsEmailModalOpen(false);

  const handleEmailSend = async (details: { email: string; reportType: 'summary' | 'all' }) => {
      setIsSendingEmail(true);
      try {
          if (details.reportType === 'summary') {
              await handleDownloadSummaryPdf();
          } else {
              await handleDownloadAllPdf();
          }

          const subject = 'Izvještaji o obradi faktura';
          const body = `Poštovani,\n\nMolimo pronađite tražene izvještaje u prilogu koji je upravo preuzet na Vaše računalo.\n\nS poštovanjem,\nPDV Kalkulator`;
          
          // Use timeout to give browser time to initiate download before mailto link
          setTimeout(() => {
              window.location.href = `mailto:${details.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              handleCloseEmailModal();
          }, 500);

      } catch (error) {
          console.error("Greška pri pripremi emaila:", error);
          alert("Došlo je do greške prilikom generiranja PDF-a za slanje.");
      } finally {
          setIsSendingEmail(false);
      }
  };

  const anyProcessRunning = isProcessing || isGeneratingCombinedPdf || isGeneratingSummaryPdf || isMergingPdfs || isCombiningAll;

  return (
    <>
      {isPrinting && (
         <div className="print-container">
            {fileToPrint ? (
              // Printing a single file
              <div key={fileToPrint.id} className="printable-page">
                <ReportContent data={fileToPrint.data!} originalPdfFile={fileToPrint.file} />
              </div>
            ) : (
              // Printing all selected successful files
              filesToPrint?.map(file => (
                <div key={file.id} className="printable-page">
                  <ReportContent data={file.data!} originalPdfFile={file.file} />
                </div>
              ))
            )}
        </div>
      )}
      <div className={`min-h-screen bg-background font-sans ${isPrinting ? 'hidden' : ''}`}>
        <EmailModal
            isOpen={isEmailModalOpen}
            onClose={handleCloseEmailModal}
            onSend={handleEmailSend}
            isSending={isSendingEmail}
        />
        <header className="bg-white shadow-sm dark:bg-slate-800 dark:border-b dark:border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <IconBook className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-text">PDV Kalkulator za Fakture</h1>
            </div>
             <button
                onClick={handleThemeToggle}
                className="p-2 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? (
                    <IconMoon className="h-5 w-5" />
                ) : (
                    <IconSun className="h-5 w-5" />
                )}
            </button>
          </div>
        </header>
        
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-border dark:bg-card">
              <h2 className="text-xl font-semibold text-text mb-1">Učitajte Fakture za Provizije Booking.com</h2>
              <p className="text-text-secondary mb-6">Sustav će automatski izvući podatke za svaku datoteku (PDF, JPG, PNG, HEIC) i proizvesti točne PDV obračune i Uplatnice. Preporučamo opciju Kombiniraj sve…</p>
              <FileUpload onFileSelect={handleFileSelection} disabled={anyProcessRunning} />
            </div>

            {processedFiles.length > 0 && (
              <div className="mt-8 space-y-4">
                 <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-semibold text-text">Rezultati obrade</h3>
                   <div className="flex items-center space-x-2">
                    <button
                      onClick={handleClearAll}
                      className="text-sm font-medium text-red-600 hover:text-red-700 dark:hover:text-red-500 disabled:opacity-50"
                      disabled={anyProcessRunning}
                    >
                      Očisti sve
                    </button>
                  </div>
                </div>
                <GroupedInvoiceSelector
                  files={processedFiles}
                  onDataUpdate={handleDataUpdate}
                  onDownloadAll={handleDownloadAllPdf}
                  onDownloadSummary={handleDownloadSummaryPdf}
                  onMergePdfs={handleMergeAllOriginalPdfs}
                  onCombineAll={handleCombineAll}
                  onPrintAll={handlePrintAll}
                  onPrintSingle={handlePrintSingle}
                  onOpenEmailModal={handleOpenEmailModal}
                  isProcessing={anyProcessRunning}
                />
              </div>
            )}
          </div>
        </main>
         <footer className="text-center py-6 text-sm text-text-secondary">
          <p>&copy; {new Date().getFullYear()} PDV Kalkulator. Pokreće Gemini AI.</p>
          <p className="mt-2">
            <a 
              href="https://wa.me/38598667806" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Created by AppsBYSmokvina +38598667806
            </a>
          </p>
        </footer>
      </div>
    </>
  );
};

export default App;