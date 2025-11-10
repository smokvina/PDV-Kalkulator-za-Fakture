import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { InvoiceData } from '../types';
import { ReportContent } from './ReportContent';
import { CollapsibleSection } from './CollapsibleSection';
import { IconPencil, IconDownload, IconPrinter, IconInfo } from './Icons';

interface ResultsDisplayProps {
  initialData: InvoiceData;
  onDataUpdate: (updatedData: InvoiceData) => void;
  originalPdfFile: File | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ initialData, onDataUpdate, originalPdfFile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InvoiceData>(initialData);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const keys = name.split('.');
    
    setFormData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      let finalValue: any = value;
      if (type === 'number') {
        finalValue = parseFloat(value) || 0;
      }
      if ((e.target as HTMLInputElement).type === 'checkbox') {
        finalValue = (e.target as HTMLInputElement).checked;
      }
      
      current[keys[keys.length - 1]] = finalValue;
      return newData;
    });
  };

  const handleSave = () => {
    onDataUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(initialData);
    setIsEditing(false);
  };
  
  const handleGeneratePdf = async () => {
    if (!reportContentRef.current) return;
    setIsGeneratingPdf(true);
    try {
        const canvas = await html2canvas(reportContentRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`izvjestaj-${originalPdfFile?.name.replace('.pdf', '') || 'faktura'}.pdf`);
    } catch (error) {
        console.error("Greška pri generiranju PDF-a:", error);
        alert("Došlo je do greške pri generiranju PDF-a.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && reportContentRef.current) {
        printWindow.document.write('<html><head><title>Ispis izvještaja</title>');
        // Ideally, link to a stylesheet for better print format
        printWindow.document.write('<style>body { font-family: sans-serif; -webkit-print-color-adjust: exact; } .bg-slate-50 { background-color: #f8fafc; } .bg-blue-50 { background-color: #eff6ff; } </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(reportContentRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Uređivanje podataka</h3>
        
        <div className="space-y-4">
            <CollapsibleSection title="Dobavljač" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Naziv" name="supplier.name" value={formData.supplier.name} onChange={handleInputChange} />
                    <InputField label="Adresa" name="supplier.address" value={formData.supplier.address} onChange={handleInputChange} />
                    <InputField label="PDV ID" name="supplier.vat_id" value={formData.supplier.vat_id} onChange={handleInputChange} />
                    <CheckboxField label="Valjan EU PDV ID" name="supplier.is_eu_vat_valid" checked={formData.supplier.is_eu_vat_valid} onChange={handleInputChange} />
                </div>
            </CollapsibleSection>

             <CollapsibleSection title="Kupac" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Naziv" name="buyer.name" value={formData.buyer.name} onChange={handleInputChange} />
                    <InputField label="Adresa" name="buyer.address" value={formData.buyer.address} onChange={handleInputChange} />
                    <InputField label="PDV ID (Kupac)" name="buyer.vat_id" value={formData.buyer.vat_id || ''} onChange={handleInputChange} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Detalji Fakture" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Broj fakture" name="invoice.invoice_number" value={formData.invoice.invoice_number} onChange={handleInputChange} />
                    <InputField label="Datum fakture" name="invoice.invoice_date" value={formData.invoice.invoice_date} onChange={handleInputChange} type="date" />
                    <InputField label="Valuta" name="invoice.currency" value={formData.invoice.currency} onChange={handleInputChange} />
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="Obračun PDV-a" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Osnovica za PDV" name="calculations.commission_base" value={formData.calculations.commission_base} onChange={handleInputChange} type="number" />
                    <InputField label="Stopa PDV-a (%)" name="calculations.vat_rate_percent" value={formData.calculations.vat_rate_percent} onChange={handleInputChange} type="number" />
                    <InputField label="Iznos PDV-a" name="calculations.vat_amount" value={formData.calculations.vat_amount} onChange={handleInputChange} type="number" />
                    <InputField label="Ukupno s PDV-om" name="calculations.commission_total_with_vat" value={formData.calculations.commission_total_with_vat} onChange={handleInputChange} type="number" />
                 </div>
            </CollapsibleSection>

            <CollapsibleSection title="Akcije i Upute">
                <div className="p-2 space-y-4">
                    <CheckboxField label="Primjenjuje se prijenos porezne obveze (Reverse Charge)" name="actions.reverse_charge_applies" checked={formData.actions.reverse_charge_applies} onChange={handleInputChange} />
                    <CheckboxField label="Potreban ručni pregled" name="actions.manual_review_required" checked={formData.actions.manual_review_required} onChange={handleInputChange} />
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Upute za PDV Prijavu</label>
                         <textarea 
                            name="actions.instructions_for_pdv_form"
                            value={formData.actions.instructions_for_pdv_form}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full mt-1 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm font-mono"
                        />
                    </div>
                </div>
            </CollapsibleSection>
        </div>

        <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-200">
            <button onClick={handleCancel} className="text-sm font-semibold text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200">
                Odustani
            </button>
            <button onClick={handleSave} className="text-sm font-semibold text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 shadow-sm">
                Spremi promjene
            </button>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-center text-sm text-slate-500">
                <IconInfo className="w-4 h-4 mr-2"/>
                <span>Ovo je AI-generirani sažetak. Podatke možete urediti po potrebi.</span>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => setIsEditing(true)} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50"
                    title="Uredi podatke"
                >
                    <IconPencil className="w-4 h-4 mr-1.5" />
                    <span>Uredi</span>
                </button>
                 <button 
                    onClick={handleGeneratePdf} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    title="Preuzmi kao PDF"
                    disabled={isGeneratingPdf}
                >
                    <IconDownload className="w-4 h-4 mr-1.5" />
                    <span>{isGeneratingPdf ? 'Generiram...' : 'PDF'}</span>
                </button>
                 <button 
                    onClick={handlePrint} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50"
                    title="Ispiši"
                >
                    <IconPrinter className="w-4 h-4 mr-1.5" />
                    <span>Ispiši</span>
                </button>
            </div>
        </div>
        <div ref={reportContentRef}>
            <ReportContent data={formData} originalPdfFile={originalPdfFile} />
        </div>
    </div>
  );
};


interface InputFieldProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, type = 'text' }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            step={type === 'number' ? '0.01' : undefined}
            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
        />
    </div>
);

interface CheckboxFieldProps {
    label: string;
    name: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({ label, name, checked, onChange }) => (
    <div className="flex items-center pt-6">
        <input
            type="checkbox"
            id={name}
            name={name}
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
        />
        <label htmlFor={name} className="ml-2 block text-sm font-medium text-slate-700">{label}</label>
    </div>
);
