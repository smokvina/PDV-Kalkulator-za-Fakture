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
import { SummaryReport, PdvStatementContent, PdvInstructionsContent, PdvFormsContent } from './components/SummaryReport';
import { EmailModal } from './components/EmailModal';
import { INVOICE_SYSTEM_PROMPT, INVOICE_SCHEMA, PDV_XML_TEMPLATE, PDVS_XML_TEMPLATE } from './constants';
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

  const [isGeneratingPdvStatement, setIsGeneratingPdvStatement] = useState<boolean>(false);
  const [isGeneratingPdvInstruction, setIsGeneratingPdvInstruction] = useState<boolean>(false);
  const [isGeneratingPdvForms, setIsGeneratingPdvForms] = useState<boolean>(false);
  const [isGeneratingPdvFormsSingle, setIsGeneratingPdvFormsSingle] = useState<string | null>(null); // File ID
  const [isGeneratingXml, setIsGeneratingXml] = useState<string | null>(null); // Can be 'single' or 'bulk'


  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      // 1. Theme
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme('light'); // Default to light theme
      }
      
      // 2. Processed Files
      const savedFilesJSON = localStorage.getItem('processedFiles');
      if (savedFilesJSON) {
        const savedFiles = JSON.parse(savedFilesJSON);
        const restoredFiles: ProcessedFile[] = savedFiles.map((f: any) => ({
          ...f,
          file: null, // File object cannot be stored, must be re-uploaded for functions requiring original
        }));
        setProcessedFiles(restoredFiles);
      }
    } catch (error) {
      console.error("Greška pri učitavanju stanja iz localStorage:", error);
      localStorage.removeItem('processedFiles');
    }
  }, []);

  // Save state to localStorage whenever processedFiles changes
  useEffect(() => {
    try {
      const serializableFiles = processedFiles.map(({ file, ...rest }) => ({
        ...rest,
        // Store fileName from data if file object is gone, fallback to file.name
        fileName: rest.data?.meta.source_file || file?.name,
      }));
      if (serializableFiles.length > 0) {
        localStorage.setItem('processedFiles', JSON.stringify(serializableFiles));
      } else {
        localStorage.removeItem('processedFiles');
      }
    } catch (error) {
      console.error("Greška pri spremanju stanja u localStorage:", error);
    }
  }, [processedFiles]);


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
      // Prevent adding duplicates if user selects the same file again
      const existingFileNames = new Set(prevFiles.map(f => f.file?.name));
      const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.file.name));
      return [...prevFiles, ...uniqueNewFiles];
    });
  }, []);
  
  const parseSingleInvoice = useCallback(async (fileToProcess: ProcessedFile) => {
    if (!fileToProcess.file) {
        setProcessedFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: 'error', error: "Originalna datoteka nije dostupna. Potrebno ju je ponovno učitati." } : f));
        return;
    }
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
      
      // Inject original filename into metadata
      parsedJson.meta.source_file = finalFile.name;

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
  
  // Generic PDF generator from a React component
  const generatePdfFromComponent = async (
    Component: React.ElementType, 
    props: any, 
    filename: string,
    pageWidthMM: number = 210 // A4 width
  ) => {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = `${pageWidthMM}mm`;
      document.body.appendChild(container);

      const root = ReactDOM.createRoot(container);
      root.render(
          <React.StrictMode>
              <Component {...props} />
          </React.StrictMode>
      );
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Time for render

      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      
      root.unmount();
      document.body.removeChild(container);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // OPTIMIZATION: Use JPEG with high quality
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // OPTIMIZATION: Specify JPEG format and FAST compression
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
      }

      pdf.save(filename);
  };

  const handleDownloadAllPdf = async () => {
    const filesToGenerate = processedFiles.filter(f => f.status === 'success' && f.data);
    if (filesToGenerate.length === 0) return;
    setIsGeneratingCombinedPdf(true);
    await generatePdfFromComponent(
        ({files}: {files: ProcessedFile[]}) => <div>{files.map(f => <div key={f.id} className="printable-page"><ReportContent data={f.data!} originalPdfFile={f.file} /></div>)}</div>,
        { files: filesToGenerate },
        `svi-izvjestaji-${new Date().toISOString().split('T')[0]}.pdf`
    );
    setIsGeneratingCombinedPdf(false);
  };

   const handleDownloadSummaryPdf = async () => {
        const filesToGenerate = processedFiles.filter(f => f.status === 'success' && f.data);
        if (filesToGenerate.length === 0) return;
        setIsGeneratingSummaryPdf(true);
        await generatePdfFromComponent(
            SummaryReport,
            { files: filesToGenerate },
            `zbirni-izvjestaj-${new Date().toISOString().split('T')[0]}.pdf`
        );
        setIsGeneratingSummaryPdf(false);
    };

  const handleMergeAllOriginalPdfs = async () => {
    const filesToMerge = processedFiles.filter(f => f.file && f.file.type === 'application/pdf').map(f => f.file!);
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
            copiedPages.forEach((page) => mergedPdfDoc.addPage(page));
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

  const handleGeneratePdvStatement = async () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return;
    setIsGeneratingPdvStatement(true);
    await generatePdfFromComponent(
        PdvStatementContent,
        { files: successfulFiles },
        `Izjava_PDV-${new Date().toISOString().split('T')[0]}.pdf`
    );
    setIsGeneratingPdvStatement(false);
  };
  
  const handleGeneratePdvInstructions = async () => {
    setIsGeneratingPdvInstruction(true);
    await generatePdfFromComponent(
        PdvInstructionsContent,
        {},
        `Uputa_PDV-PDVS_ePorezna.pdf`
    );
    setIsGeneratingPdvInstruction(false);
  };
  
 const handleGeneratePdvForms = async () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return;
    setIsGeneratingPdvForms(true);
    
    // This component will render all forms sequentially for the final PDF
    const AllFormsComponent = ({ files }: { files: ProcessedFile[] }) => (
        <div>
            {files.map(f => (
                <div key={f.id} className="printable-page">
                    {/* Pass each file individually to render a separate form page */}
                    <PdvFormsContent files={[f]} />
                </div>
            ))}
        </div>
    );

    await generatePdfFromComponent(
        AllFormsComponent,
        { files: successfulFiles },
        `Svi_PDV_i_PDVS_Obrasci-${new Date().toISOString().split('T')[0]}.pdf`
    );
    setIsGeneratingPdvForms(false);
  };

  const handleGeneratePdvFormsSingle = async (file: ProcessedFile) => {
    if (!file.data) return;
    setIsGeneratingPdvFormsSingle(file.id);
    await generatePdfFromComponent(
        PdvFormsContent,
        { files: [file] }, // Pass only the single file to generate its form
        `PDV_Obrazac_${file.data.invoice.invoice_number.replace(/[\/\s]/g, '_')}.pdf`
    );
    setIsGeneratingPdvFormsSingle(null);
  };

  const generateAndDownloadXml = (xmlString: string, filename: string) => {
    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  const generateXmlsForPeriod = (filesForPeriod: ProcessedFile[]): { pdvXml: string; pdvsXml: string } | null => {
      if (!filesForPeriod || filesForPeriod.length === 0) return null;
  
      const firstData = filesForPeriod[0].data!;
      const buyer = firstData.buyer;
      const periodDate = new Date(firstData.invoice.invoice_date);
      const year = periodDate.getFullYear();
      const month = periodDate.getMonth();
      const datumOd = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const datumDo = new Date(year, month + 1, 0).toISOString().split('T')[0];
  
      const totalBase = filesForPeriod.reduce((sum, f) => sum + f.data!.calculations.commission_base, 0);
      const totalVat = filesForPeriod.reduce((sum, f) => sum + f.data!.calculations.vat_amount, 0);
  
      const nameParts = buyer.name.split(' ');
      const ime = nameParts[0] || '';
      const prezime = nameParts.slice(1).join(' ') || '';
  
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
  
      // --- PDV Obrazac ---
      const pdvDoc = parser.parseFromString(PDV_XML_TEMPLATE, "application/xml");
      pdvDoc.querySelector("Metapodaci Autor")!.textContent = buyer.name;
      pdvDoc.querySelector("Metapodaci Datum")!.textContent = new Date().toISOString();
      pdvDoc.querySelector("Metapodaci Identifikator")!.textContent = crypto.randomUUID();
      pdvDoc.querySelector("Zaglavlje DatumOd")!.textContent = datumOd;
      pdvDoc.querySelector("Zaglavlje DatumDo")!.textContent = datumDo;
      pdvDoc.querySelector("Zaglavlje Obveznik Ime")!.textContent = ime;
      pdvDoc.querySelector("Zaglavlje Obveznik Prezime")!.textContent = prezime;
      pdvDoc.querySelector("Zaglavlje Obveznik OIB")!.textContent = buyer.vat_id.replace('HR', '');
      pdvDoc.querySelector("Zaglavlje Obveznik Mjesto")!.textContent = buyer.address.split(',')[1]?.trim() || buyer.address;
      pdvDoc.querySelector("Zaglavlje Obveznik Ulica")!.textContent = buyer.address.split(',')[0]?.trim() || '';
      
      pdvDoc.querySelector("Tijelo Podatak111")!.textContent = totalBase.toFixed(2);
      pdvDoc.querySelector("Tijelo Podatak311 Vrijednost")!.textContent = totalBase.toFixed(2);
      pdvDoc.querySelector("Tijelo Podatak311 Porez")!.textContent = totalVat.toFixed(2);
      pdvDoc.querySelector("Tijelo Podatak400")!.textContent = totalVat.toFixed(2);
      pdvDoc.querySelector("Tijelo Podatak500")!.textContent = totalVat.toFixed(2);
      pdvDoc.querySelector("Tijelo Podatak610")!.textContent = "0.00";
      const pdvXml = serializer.serializeToString(pdvDoc);
  
      // --- PDV-S Obrazac ---
      const pdvsDoc = parser.parseFromString(PDVS_XML_TEMPLATE, "application/xml");
      pdvsDoc.querySelector("Metapodaci Autor")!.textContent = buyer.name;
      pdvsDoc.querySelector("Metapodaci Datum")!.textContent = new Date().toISOString();
      pdvsDoc.querySelector("Metapodaci Identifikator")!.textContent = crypto.randomUUID();
      pdvsDoc.querySelector("Zaglavlje DatumOd")!.textContent = datumOd;
      pdvsDoc.querySelector("Zaglavlje DatumDo")!.textContent = datumDo;
      pdvsDoc.querySelector("Zaglavlje Obveznik Ime")!.textContent = ime;
      pdvsDoc.querySelector("Zaglavlje Obveznik Prezime")!.textContent = prezime;
      pdvsDoc.querySelector("Zaglavlje Obveznik OIB")!.textContent = buyer.vat_id.replace('HR', '');
      pdvsDoc.querySelector("Zaglavlje Obveznik Mjesto")!.textContent = buyer.address.split(',')[1]?.trim() || buyer.address;
      pdvsDoc.querySelector("Zaglavlje Obveznik Ulica")!.textContent = buyer.address.split(',')[0]?.trim() || '';

      const isporukeNode = pdvsDoc.querySelector("Tijelo Isporuke")!;
      const supplier = firstData.supplier;
      const isporukaEl = pdvsDoc.createElement('Isporuka');
      isporukaEl.innerHTML = `<Rbr>1</Rbr><VrstaStjecanja>a</VrstaStjecanja><NazivDobavljaca>${supplier.name}</NazivDobavljaca><AdresaDobavljaca>${supplier.address}</AdresaDobavljaca><PDVIDbrojDobavljaca>${supplier.vat_id}</PDVIDbrojDobavljaca><IznosRacuna>${totalBase.toFixed(2)}</IznosRacuna>`;
      isporukeNode.appendChild(isporukaEl);
      pdvsDoc.querySelector("Tijelo IsporukeUkupno I1")!.textContent = totalBase.toFixed(2);
      const pdvsXml = serializer.serializeToString(pdvsDoc);
  
      return { pdvXml, pdvsXml };
  };

  const handleGenerateXmlSingle = async (fileId: string) => {
    const file = processedFiles.find(f => f.id === fileId);
    if (!file || !file.data) return;
    setIsGeneratingXml(file.id);
    await new Promise(res => setTimeout(res, 200)); // Short delay for UI update
    const result = generateXmlsForPeriod([file]);
    if (result) {
        const period = file.data.invoice.invoice_date.substring(0, 7);
        generateAndDownloadXml(result.pdvXml, `PDV_${period}_${file.data.invoice.invoice_number.replace(/[\s\/]/g, '_')}.xml`);
        generateAndDownloadXml(result.pdvsXml, `PDVS_${period}_${file.data.invoice.invoice_number.replace(/[\s\/]/g, '_')}.xml`);
    }
    setIsGeneratingXml(null);
  };
  
  const handleGenerateXmlsBulk = async () => {
    const successfulFiles = processedFiles.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return;
    setIsGeneratingXml('bulk');
    await new Promise(res => setTimeout(res, 200));
    
    const filesByPeriod: Record<string, ProcessedFile[]> = successfulFiles.reduce((acc, file) => {
        const period = file.data!.invoice.invoice_date.substring(0, 7); // YYYY-MM
        if (!acc[period]) acc[period] = [];
        acc[period].push(file);
        return acc;
    }, {});

    Object.entries(filesByPeriod).forEach(([period, files]) => {
        const result = generateXmlsForPeriod(files);
        if (result) {
            generateAndDownloadXml(result.pdvXml, `ObrazacPDV_${period}.xml`);
            generateAndDownloadXml(result.pdvsXml, `ObrazacPDVS_${period}.xml`);
        }
    });

    setIsGeneratingXml(null);
  };


    const handleCombineAll = async () => {
        const filesToCombine = processedFiles.filter(f => f.status === 'success' && f.data && f.file);
        if (filesToCombine.length === 0) {
            alert("Nema dostupnih originalnih datoteka za kombiniranje. Ako ste osvježili stranicu, molimo ponovno učitajte datoteke.");
            return;
        }

        setIsCombiningAll(true);
        try {
            const combinedDoc = await PDFDocument.create();

            // Helper to render component and add as PDF page
            const addComponentAsPage = async (Component: React.ElementType, props: any) => {
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.width = '210mm';
                document.body.appendChild(container);
                const root = ReactDOM.createRoot(container);
                root.render(<React.StrictMode><Component {...props} /></React.StrictMode>);
                await new Promise(res => setTimeout(res, 300));
                const canvas = await html2canvas(container, { scale: 2, useCORS: true });
                root.unmount(); document.body.removeChild(container);
                
                // OPTIMIZATION: Use JPEG instead of PNG
                const jpegBytes = await fetch(canvas.toDataURL('image/jpeg', 0.95)).then(res => res.arrayBuffer());
                const image = await combinedDoc.embedJpg(jpegBytes);

                const page = combinedDoc.addPage();
                const { width, height } = page.getSize();
                const { width: imgWidth, height: imgHeight } = image.scale(1);
                const scale = Math.min(width / imgWidth, height / imgHeight);
                page.drawImage(image, { x: (width - imgWidth * scale) / 2, y: (height - imgHeight * scale) / 2, width: imgWidth * scale, height: imgHeight * scale });
            };

            // Component to render all individual forms for inclusion
            const AllFormsComponent = ({ files }: { files: ProcessedFile[] }) => (
                <div>
                    {files.map(f => (
                        <div key={f.id} className="printable-page"><PdvFormsContent files={[f]} /></div>
                    ))}
                </div>
            );

            // 1. Add all major generated reports first
            await addComponentAsPage(SummaryReport, { files: filesToCombine });
            await addComponentAsPage(PdvStatementContent, { files: filesToCombine });
            await addComponentAsPage(PdvInstructionsContent, {});
            await addComponentAsPage(AllFormsComponent, { files: filesToCombine });
            
            // 2. Loop through each file and add its specific documents:
            //    - Original File
            //    - Individual Report
            //    - Individual PDV/PDV-S Form
            for (const processedFile of filesToCombine) {
                if (!processedFile.file) continue;
                const { file: originalFile, mimeType } = await prepareFileForApi(processedFile.file);
                if (mimeType === 'application/pdf') {
                    const pdfBytes = await originalFile.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                    const copiedPages = await combinedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach(page => combinedDoc.addPage(page));
                } else if (mimeType.startsWith('image/')) {
                    const imgBytes = await originalFile.arrayBuffer();
                    const image = mimeType === 'image/jpeg' ? await combinedDoc.embedJpg(imgBytes) : await combinedDoc.embedPng(imgBytes);
                    const page = combinedDoc.addPage();
                    const { width, height } = page.getSize();
                    const dims = image.scale(1);
                    const scale = Math.min((width - 50) / dims.width, (height - 50) / dims.height, 1);
                    page.drawImage(image, { x: (width - dims.width * scale) / 2, y: (height - dims.height * scale) / 2, width: dims.width * scale, height: dims.height * scale });
                }
                // Add individual report
                await addComponentAsPage(ReportContent, { data: processedFile.data!, originalPdfFile: processedFile.file });
                
                // Add individual PDV/PDV-S form
                await addComponentAsPage(PdvFormsContent, { files: [processedFile] });
            }

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

  const anyProcessRunning = isProcessing || isGeneratingCombinedPdf || isGeneratingSummaryPdf || isMergingPdfs || isCombiningAll || isGeneratingPdvStatement || isGeneratingPdvInstruction || isGeneratingPdvForms || !!isGeneratingPdvFormsSingle || !!isGeneratingXml;

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
                  onGeneratePdvStatement={handleGeneratePdvStatement}
                  onGeneratePdvInstructions={handleGeneratePdvInstructions}
                  onGeneratePdvForms={handleGeneratePdvForms}
                  onGeneratePdvFormsSingle={handleGeneratePdvFormsSingle}
                  isGeneratingPdvFormsSingle={isGeneratingPdvFormsSingle}
                  onGenerateXmlsBulk={handleGenerateXmlsBulk}
                  onGenerateXmlSingle={handleGenerateXmlSingle}
                  isGeneratingXml={isGeneratingXml}
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