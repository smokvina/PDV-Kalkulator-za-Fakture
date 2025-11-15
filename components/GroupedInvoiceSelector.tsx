import React from 'react';
import type { ProcessedFile, InvoiceData } from '../types';
import { FileResultDisplay } from './FileResultDisplay';
import { IconDownload, IconPrinter, IconBook, IconClipboard, IconMail, IconLayers } from './Icons';

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
    const successfulFiles = files.filter(f => f.status === 'success' && f.data);
    const hasSuccessfulFiles = successfulFiles.length > 0;
    const hasAnyFiles = files.length > 0;

    const disabledForSuccessful = isProcessing || !hasSuccessfulFiles;
    const disabledForAny = isProcessing || !hasAnyFiles;

    return (
        <div className="mt-6">
            {/* Global Actions */}
            <div className="flex justify-end items-center flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                 <button
                    onClick={onDownloadSummary}
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Preuzmi zbirni izvještaj kao PDF"
                >
                    <IconBook className="w-4 h-4 mr-2" />
                    <span>Preuzmi sažetak</span>
                </button>
                <button
                    onClick={onMergePdfs}
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForAny}
                    title="Spoji sve učitane originalne PDF-ove u jedan dokument"
                >
                    <IconClipboard className="w-4 h-4 mr-2" />
                    <span>Spoji originale</span>
                </button>
                 <button
                    onClick={onOpenEmailModal}
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Pošalji izvještaje emailom"
                >
                    <IconMail className="w-4 h-4 mr-2" />
                    <span>Pošalji emailom</span>
                </button>
                <button
                    onClick={onPrintAll}
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabledForSuccessful}
                    title="Ispiši sve uspješno obrađene fakture"
                >
                    <IconPrinter className="w-4 h-4 mr-2" />
                    <span>Ispiši sve</span>
                </button>
                <button
                    onClick={onDownloadAll}
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="p-6 text-center text-slate-500 bg-white rounded-2xl shadow-lg border border-slate-200">
                        <p className="font-semibold">Nema datoteka za prikaz.</p>
                        <p className="text-sm mt-1">Učitajte PDF fakture kako biste započeli s obradom.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
