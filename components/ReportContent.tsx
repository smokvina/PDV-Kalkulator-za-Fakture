import React from 'react';
import type { InvoiceData } from '../types';

interface ReportContentProps {
  data: InvoiceData;
  originalPdfFile: File | null;
}

export const ReportContent: React.FC<ReportContentProps> = ({ data, originalPdfFile }) => (
     <div className="report-content-wrapper p-8 font-sans text-sm text-text bg-white dark:bg-card">
        <h1 className="text-2xl font-bold mb-2 text-primary">Izvještaj o Obradi Fakture</h1>
        <p className="text-text-secondary mb-6">Generirano: {new Date(data.meta.parsed_at).toLocaleString('hr-HR')}</p>

        <div className="my-8 p-6 bg-primary/10 rounded-xl border-2 border-primary/20">
            <p className="text-base font-semibold text-primary/80 uppercase tracking-widest text-center mb-2">Objekt</p>
            <h2 className="text-3xl font-bold text-primary text-center tracking-tight">{data.buyer.name}</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
                <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2">Dobavljač</h3>
                <p><strong>Naziv:</strong> {data.supplier.name}</p>
                <p><strong>Adresa:</strong> {data.supplier.address}</p>
                <p><strong>PDV ID:</strong> {data.supplier.vat_id} {data.supplier.is_eu_vat_valid ? '(Valjan EU PDV ID)' : ''}</p>
            </div>
             <div>
                <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2">Kupac</h3>
                <p><strong>Naziv:</strong> {data.buyer.name}</p>
                <p><strong>Adresa:</strong> {data.buyer.address}</p>
                <p><strong>PDV ID (OIB):</strong> {data.buyer.vat_id}</p>
            </div>
        </div>
        
         <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2">Detalji Fakture</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-6">
             <p><strong>Broj:</strong> {data.invoice.invoice_number}</p>
             <p><strong>Datum:</strong> {data.invoice.invoice_date}</p>
             <p><strong>Razdoblje:</strong> {data.invoice.service_period_from} - {data.invoice.service_period_to}</p>
             <p><strong>Valuta:</strong> {data.invoice.currency}</p>
         </div>

        <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2">Stavke</h3>
        <table className="w-full text-left mb-6">
            <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/50">
                    <th className="p-2 font-semibold">Opis</th>
                    <th className="p-2 text-right font-semibold">Iznos ({data.invoice.currency})</th>
                </tr>
            </thead>
            <tbody>
                {data.line_items.map((item, index) => (
                    <tr key={index} className="border-b border-border">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2">Obračun PDV-a (Reverse Charge)</h3>
        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-lg">
             <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p>Osnovica za PDV (provizija):</p><p className="font-bold text-right">{data.calculations.commission_base.toFixed(2)} {data.invoice.currency}</p>
                <p>Stopa PDV-a:</p><p className="font-bold text-right">{data.calculations.vat_rate_percent}%</p>
                <p>Iznos obračunatog PDV-a:</p><p className="font-bold text-right">{data.calculations.vat_amount.toFixed(2)} {data.invoice.currency}</p>
                <p className="border-t border-border pt-2 mt-2">Ukupno s PDV-om:</p><p className="font-bold text-right border-t border-border pt-2 mt-2">{data.calculations.commission_total_with_vat.toFixed(2)} {data.invoice.currency}</p>
             </div>
             {data.calculations.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-4"><em>Napomena: {data.calculations.notes}</em></p>}
        </div>
        
        <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mt-6 mb-2">Upute za PDV Prijavu</h3>
        <p className="whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-xs">{data.actions.instructions_for_pdv_form}</p>
        
        <div className="mt-8 text-xs text-text-secondary text-center border-t pt-4">
            <p>Ovo je informativni izračun generiran pomoću AI. Za konačni porezni savjet, molimo konzultirajte svog računovođu.</p>
            <p>Izvorni dokument: {originalPdfFile?.name}</p>
        </div>
    </div>
);