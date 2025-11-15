import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ProcessedFile, InvoiceData } from '../types';
import { FileResultDisplay } from './FileResultDisplay';
import { IconDownload, IconPrinter, IconBook, IconClipboard, IconMail, IconLayers, IconBarcode, PaymentSlip } from './Icons';

interface ResultsListProps {
    files: ProcessedFile[];
    onDataUpdate: (fileId: string, updatedData: InvoiceData) => void;
    onDownloadAll: () => Promise<void>;
    onDownloadSummary: () => Promise<void>;
    onMergePdfs: () => Promise<void>;
    onCombineAll: () => Promise<void>;
    onPrintAll: () => void;
    onPrintSingle: (fileId: string) => void;
    onOpenEmailModal: () => void;
    isProcessing: boolean;
}

export const GroupedInvoiceSelector: React.FC<ResultsListProps> = ({
    files,
    onDataUpdate,
    onDownloadAll,
    onDownloadSummary,
    onMergePdfs,
    onCombineAll,
    onPrintAll,
    onPrintSingle,
    onOpenEmailModal,
    isProcessing,
}) => {
    const [isGeneratingSummaryPaymentPdf, setIsGeneratingSummaryPaymentPdf] = useState(false);
    
    const successfulFiles = files.filter(f => f.status === 'success' && f.data);
    const hasSuccessfulFiles = successfulFiles.length > 0;
    const hasAnyFiles = files.length > 0;

    const disabledForSuccessful = isProcessing || !hasSuccessfulFiles;
    const disabledForAny = isProcessing || !hasAnyFiles;

    const handleGenerateSummaryPaymentPdf = async () => {
        if (!hasSuccessfulFiles) return;
        setIsGeneratingSummaryPaymentPdf(true);
        try {
            const totalVat = successfulFiles.reduce((acc, f) => acc + (f.data?.calculations.vat_amount || 0), 0);
            if (totalVat <= 0) {
                alert("Ukupan iznos PDV-a je 0. Nema potrebe za generiranjem uplatnice.");
                setIsGeneratingSummaryPaymentPdf(false);
                return;
            }

            const firstFile = successfulFiles[0].data!;
            const latestPeriodFile = successfulFiles.reduce((latest, current) => 
                new Date(latest.data!.invoice.service_period_to) > new Date(current.data!.invoice.service_period_to) ? latest : current
            );
            const latestPeriod = latestPeriodFile.data!.invoice.service_period_to;
            const periodFormatted = latestPeriod ? `${latestPeriod.substring(5, 7)}${latestPeriod.substring(2, 4)}` : '';
            const oib = firstFile.buyer.vat_id.toUpperCase().replace('HR', '');

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '180mm';
            document.body.appendChild(container);

            const root = ReactDOM.createRoot(container);
            const slipProps = {
                payerName: firstFile.buyer.name,
                payerAddress: firstFile.buyer.address,
                recipientName: 'MINISTARSTVO FINANCIJA, POREZNA UPRAVA',
                recipientAddress: 'A. Vončinina 3, 10000 Zagreb',
                recipientIban: 'HR1210010051863000160',
                amount: totalVat,
                currency: 'EUR',
                model: 'HR68',
                pozivNaBroj: `${oib}-${periodFormatted}`,
                sifraNamjene: 'PDVD',
                opisPlacanja: `Zbirna uplata PDV za razdoblje ${periodFormatted.substring(0,2)}/${periodFormatted.substring(2,4)}`,
            };
            
            root.render(<React.StrictMode><PaymentSlip {...slipProps} /></React.StrictMode>);
            
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(container, { scale: 3, useCORS: true });
            
            root.unmount();
            document.body.removeChild(container);
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [85, 185] });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`Zbirna_uplatnica_PDV_${periodFormatted}.pdf`);

        } catch (error) {
            console.error("Greška pri generiranju zbirne PDF uplatnice:", error);
            alert("Došlo je do greške pri generiranju zbirne PDF uplatnice.");
        } finally {
            setIsGeneratingSummaryPaymentPdf(false);
        }
    };

    return (
        <div className="mt-6">
            {/* Global Actions */}
            <div className="flex justify-end items-center flex-wrap gap-2 p-4 bg-slate-50 dark:bg-card dark:border-border rounded-xl border border-border mb-6">
                 <button
                    onClick={handleGenerateSummaryPaymentPdf}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful || isGeneratingSummaryPaymentPdf}
                    title="Generiraj zbirnu uplatnicu za PDV"
                >
                    <IconBarcode className="w-4 h-4 mr-2" />
                    <span>{isGeneratingSummaryPaymentPdf ? 'Generiram...' : 'Zbirna uplatnica'}</span>
                </button>
                 <button
                    onClick={onDownloadSummary}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Preuzmi zbirni izvještaj kao PDF"
                >
                    <IconBook className="w-4 h-4 mr-2" />
                    <span>Preuzmi sažetak</span>
                </button>
                <button
                    onClick={onMergePdfs}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForAny}
                    title="Spoji sve učitane originalne PDF-ove u jedan dokument"
                >
                    <IconClipboard className="w-4 h-4 mr-2" />
                    <span>Spoji originale</span>
                </button>
                 <button
                    onClick={onOpenEmailModal}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Pošalji izvještaje emailom"
                >
                    <IconMail className="w-4 h-4 mr-2" />
                    <span>Pošalji emailom</span>
                </button>
                <button
                    onClick={onPrintAll}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Ispiši sve uspješno obrađene fakture"
                >
                    <IconPrinter className="w-4 h-4 mr-2" />
                    <span>Ispiši sve</span>
                </button>
                <button
                    onClick={onDownloadAll}
                    className="flex items-center text-sm font-semibold bg-white dark:bg-slate-700 dark:border-border dark:text-slate-200 dark:hover:bg-slate-600 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Spoji sve uspješno obrađene izvještaje u jedan PDF"
                >
                    <IconDownload className="w-4 h-4 mr-2" />
                    <span>Spoji izvještaje</span>
                </button>
                 <button
                    onClick={onCombineAll}
                    className="flex items-center text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Spoji sve originalne datoteke i generirane izvještaje u jedan PDF"
                >
                    <IconLayers className="w-4 h-4 mr-2" />
                    <span>Kombiniraj sve</span>
                </button>
            </div>

            {/* Files List */}
            <div className="space-y-4">
                {files.length > 0 ? (
                    files.map(file => (
                        <FileResultDisplay
                            key={file.id}
                            processedFile={file}
                            onDataUpdate={(updatedData) => onDataUpdate(file.id, updatedData)}
                            onPrintSingle={() => onPrintSingle(file.id)}
                        />
                    ))
                ) : (
                    <div className="p-6 text-center text-text-secondary bg-white dark:bg-card rounded-2xl shadow-lg border border-border">
                        <p className="font-semibold">Nema datoteka za prikaz.</p>
                        <p className="text-sm mt-1">Učitajte PDF fakture kako biste započeli s obradom.</p>
                    </div>
                )}
            </div>
        </div>
    );
};