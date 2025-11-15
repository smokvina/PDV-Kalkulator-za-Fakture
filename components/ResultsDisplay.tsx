import React, { useState, useRef, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import type { InvoiceData } from '../types';
import { ReportContent } from './ReportContent';
import { CollapsibleSection } from './CollapsibleSection';
import { IconPencil, IconDownload, IconPrinter, IconInfo, IconBarcode, PaymentSlip, IconAlertTriangle } from './Icons';

interface ResultsDisplayProps {
  initialData: InvoiceData;
  onDataUpdate: (updatedData: InvoiceData) => void;
  originalPdfFile: File | null;
  onPrint: () => void;
}

// Define a version of InvoiceData where line item amounts can be strings for editing
type FormLineItem = {
  description: string;
  amount: string | number;
};

type FormInvoiceData = Omit<InvoiceData, 'line_items'> & {
  line_items: FormLineItem[];
};


const createSafeFilename = (prefix: string, supplier: string, invoiceNumber: string): string => {
    const sanitize = (str: string) => str ? String(str).replace(/[\s\\/:"*?<>|]+/g, '_') : '';
    const parts = [
        prefix,
        sanitize(supplier),
        sanitize(invoiceNumber)
    ].filter(Boolean);

    if (parts.length <= 1) {
        return `${prefix || 'dokument'}_${new Date().toISOString().split('T')[0]}.pdf`;
    }

    return `${parts.join('_')}.pdf`;
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ initialData, onDataUpdate, originalPdfFile, onPrint }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormInvoiceData>(initialData);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPaymentPdf, setIsGeneratingPaymentPdf] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const calculateVatBase = useMemo(() => {
    return (items: Array<{ description: string; amount: number; }>): number => {
      const reservationItems = items.filter(item => 
        item.description.toLowerCase().includes('reservations') || 
        item.description.toLowerCase().includes('rezervacije')
      );
      return reservationItems.reduce((sum, item) => sum + item.amount, 0);
    };
  }, []);

  // Recalculate when form data changes, only in edit mode
  useEffect(() => {
    if (!isEditing) return;

    const newVatBase = calculateVatBase(
      // Temporarily convert string amounts to numbers for calculation
      formData.line_items.map(item => ({
          ...item,
          amount: parseFloat(String(item.amount)) || 0
      }))
    );
    const vatRate = formData.calculations.vat_rate_percent || 0;
    const newVatAmount = parseFloat(((newVatBase * vatRate) / 100).toFixed(2));
    const newTotal = newVatBase + newVatAmount;
    
    if (
      newVatBase !== formData.calculations.commission_base || 
      newVatAmount !== formData.calculations.vat_amount ||
      newTotal !== formData.calculations.commission_total_with_vat
    ) {
      setFormData(prev => ({
          ...prev,
          calculations: {
              ...prev.calculations,
              commission_base: newVatBase,
              vat_amount: newVatAmount,
              commission_total_with_vat: newTotal,
          }
      }));
    }
  }, [isEditing, formData.line_items, formData.calculations.vat_rate_percent, calculateVatBase, formData.calculations.commission_base, formData.calculations.vat_amount, formData.calculations.commission_total_with_vat]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const keys = name.split('.');
    
    setFormData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
      let current: any = newData;
      
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

  const handleLineItemChange = (index: number, field: 'description' | 'amount', value: string) => {
    setFormData(prevData => {
        const newLineItems = [...prevData.line_items];
        newLineItems[index] = { ...newLineItems[index], [field]: value };
        return { ...prevData, line_items: newLineItems };
    });
  };

  const handleStartEditing = () => {
      setFormData(prev => ({
          ...prev,
          line_items: prev.line_items.map(item => ({...item, amount: String(item.amount)}))
      }));
      setIsEditing(true);
  };

  const handleSave = () => {
    const hasErrors = formData.line_items.some(item => {
        const amountNum = parseFloat(String(item.amount));
        return isNaN(amountNum) || amountNum < 0;
    });

    if (hasErrors) {
        alert("Molimo ispravite iznose. Iznosi moraju biti važeći pozitivni brojevi.");
        return;
    }
    
    const dataToSave: InvoiceData = {
        ...formData,
        line_items: formData.line_items.map(item => ({
            ...item,
            amount: parseFloat(String(item.amount)) || 0
        }))
    };

    onDataUpdate(dataToSave);
    setFormData(dataToSave);
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
        
        const filename = createSafeFilename(
            'Izvjestaj',
            formData.supplier.name,
            formData.invoice.invoice_number
        );
        pdf.save(filename);

    } catch (error) {
        console.error("Greška pri generiranju PDF-a:", error);
        alert("Došlo je do greške pri generiranju PDF-a.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleGeneratePaymentPdf = async () => {
    setIsGeneratingPaymentPdf(true);
    try {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '180mm';
        document.body.appendChild(container);

        const root = ReactDOM.createRoot(container);

        const oib = formData.buyer.vat_id.toUpperCase().replace('HR', '');
        const period = formData.invoice.service_period_to;
        const periodFormatted = period ? `${period.substring(5, 7)}${period.substring(2, 4)}` : '';

        const slipProps = {
            payerName: formData.buyer.name,
            payerAddress: formData.buyer.address,
            recipientName: 'MINISTARSTVO FINANCIJA, POREZNA UPRAVA',
            recipientAddress: 'A. Vončinina 3, 10000 Zagreb',
            recipientIban: 'HR1210010051863000160',
            amount: formData.calculations.vat_amount,
            currency: 'EUR',
            model: 'HR68',
            pozivNaBroj: `${oib}-${periodFormatted}`,
            sifraNamjene: 'PDVD',
            opisPlacanja: `Uplata PDV po računu ${formData.invoice.invoice_number}`,
        };
        
        root.render(
            <React.StrictMode>
                <PaymentSlip {...slipProps} />
            </React.StrictMode>
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(container, { scale: 3, useCORS: true });
        
        root.unmount();
        document.body.removeChild(container);
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'l',
            unit: 'mm',
            format: [85, 185]
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

        const filename = createSafeFilename(
            'Uplatnica',
            formData.supplier.name,
            formData.invoice.invoice_number
        );
        pdf.save(filename);

    } catch (error) {
        console.error("Greška pri generiranju PDF uplatnice:", error);
        alert("Došlo je do greške pri generiranju PDF uplatnice.");
    } finally {
        setIsGeneratingPaymentPdf(false);
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h3 className="text-xl font-bold text-primary text-center mb-6">Uređivanje podataka</h3>
        
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
                    <InputField label="PDV ID (OIB)" name="buyer.vat_id" value={formData.buyer.vat_id} onChange={handleInputChange} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Detalji Fakture" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Broj fakture" name="invoice.invoice_number" value={formData.invoice.invoice_number} onChange={handleInputChange} />
                    <InputField label="Datum fakture" name="invoice.invoice_date" value={formData.invoice.invoice_date} onChange={handleInputChange} type="date" />
                    <InputField label="Valuta" name="invoice.currency" value={formData.invoice.currency} onChange={handleInputChange} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Stavke Računa" defaultOpen>
                <div className="p-2 space-y-3">
                    {formData.line_items.map((item, index) => {
                        const amountStr = String(item.amount).trim();
                        const amountNum = parseFloat(amountStr);
                        const isInvalid = amountStr !== '' && (isNaN(amountNum) || amountNum < 0);

                        return (
                            <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <div className="sm:col-span-2">
                                    <InputField label={`Opis ${index + 1}`} name={`line_items.${index}.description`} value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} />
                                </div>
                                <div>
                                    <InputField 
                                        label="Iznos" 
                                        name={`line_items.${index}.amount`} 
                                        value={item.amount as string} 
                                        onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)} 
                                        type="text" 
                                        error={isInvalid} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="Obračun PDV-a" defaultOpen>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    <InputField label="Osnovica za PDV (automatski)" name="calculations.commission_base" value={formData.calculations.commission_base} onChange={()=>{}} type="number" readOnly={true} helpText="Osnovica se automatski računa iz stavki koje sadrže 'Rezervacije' ili 'Reservations'." />
                    <InputField label="Stopa PDV-a (%)" name="calculations.vat_rate_percent" value={formData.calculations.vat_rate_percent} onChange={handleInputChange} type="number" />
                    <InputField label="Iznos PDV-a (automatski)" name="calculations.vat_amount" value={formData.calculations.vat_amount} onChange={()=>{}} type="number" readOnly={true} />
                    <InputField label="Ukupno s PDV-om (automatski)" name="calculations.commission_total_with_vat" value={formData.calculations.commission_total_with_vat} onChange={()=>{}} type="number" readOnly={true} />
                 </div>
            </CollapsibleSection>

            <CollapsibleSection title="Akcije i Upute">
                <div className="p-2 space-y-4">
                    <CheckboxField label="Primjenjuje se prijenos porezne obveze (Reverse Charge)" name="actions.reverse_charge_applies" checked={formData.actions.reverse_charge_applies} onChange={handleInputChange} />
                    <CheckboxField label="Potreban ručni pregled" name="actions.manual_review_required" checked={formData.actions.manual_review_required} onChange={handleInputChange} />
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Upute za PDV Prijavu</label>
                         <textarea 
                            name="actions.instructions_for_pdv_form"
                            value={formData.actions.instructions_for_pdv_form}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full mt-1 p-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        />
                    </div>
                </div>
            </CollapsibleSection>
        </div>

        <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={handleCancel} className="text-sm font-semibold text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
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
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-border">
            <div className="flex items-center text-sm text-slate-500 dark:text-text-secondary">
                <IconInfo className="w-4 h-4 mr-2"/>
                <span>Ovo je AI-generirani sažetak. Podatke možete urediti po potrebi.</span>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={handleStartEditing} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                    title="Uredi podatke"
                >
                    <IconPencil className="w-4 h-4 mr-1.5" />
                    <span>Uredi</span>
                </button>
                <button 
                    onClick={handleGeneratePaymentPdf} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                    title="Generiraj uplatnicu"
                    disabled={isGeneratingPaymentPdf}
                >
                    <IconBarcode className="w-4 h-4 mr-1.5" />
                    <span>{isGeneratingPaymentPdf ? 'Generiram...' : 'Uplatnica'}</span>
                </button>
                 <button 
                    onClick={handleGeneratePdf} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                    title="Preuzmi kao PDF"
                    disabled={isGeneratingPdf}
                >
                    <IconDownload className="w-4 h-4 mr-1.5" />
                    <span>{isGeneratingPdf ? 'Generiram...' : 'PDF'}</span>
                </button>
                 <button 
                    onClick={onPrint} 
                    className="flex items-center text-sm font-semibold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                    title="Ispiši"
                >
                    <IconPrinter className="w-4 h-4 mr-1.5" />
                    <span>Ispiši</span>
                </button>
            </div>
        </div>
        <div ref={reportContentRef}>
            <ReportContent data={formData as InvoiceData} originalPdfFile={originalPdfFile} />
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
    readOnly?: boolean;
    helpText?: string;
    error?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, type = 'text', readOnly = false, helpText, error = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                step={type === 'number' ? '0.01' : undefined}
                inputMode={type === 'text' ? 'decimal' : undefined}
                className={`w-full p-2 border rounded-md shadow-sm text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 ${readOnly ? 'bg-slate-100 dark:bg-slate-600 cursor-not-allowed' : ''} ${error ? 'border-red-500 pr-10 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-primary focus:border-primary'}`}
                aria-invalid={error}
            />
            {error && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <IconAlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
            )}
        </div>
        {helpText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helpText}</p>}
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
            className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded dark:bg-slate-600 dark:border-slate-500"
        />
        <label htmlFor={name} className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    </div>
);