import React from 'react';
import type { ProcessedFile } from '../types';

interface SummaryReportProps {
  files: ProcessedFile[];
}

export const SummaryReport: React.FC<SummaryReportProps> = ({ files }) => {
  const successfulFiles = files.filter(f => f.status === 'success' && f.data);
  if (successfulFiles.length === 0) {
    return <div>Nema uspješno obrađenih faktura za prikaz sažetka.</div>;
  }

  const totals = successfulFiles.reduce((acc, curr) => {
    if (curr.data) {
      acc.base += curr.data.calculations.commission_base;
      acc.vat += curr.data.calculations.vat_amount;
      acc.total += curr.data.calculations.commission_total_with_vat;
    }
    return acc;
  }, { base: 0, vat: 0, total: 0 });

  const currency = successfulFiles[0].data?.invoice.currency || 'EUR';

  return (
    <div className="report-content-wrapper p-8 font-sans text-sm text-slate-800 bg-white">
      <h1 className="text-2xl font-bold mb-2 text-primary">Zbirni Izvještaj o Obradi Faktura</h1>
      <p className="text-slate-500 mb-6">Generirano: {new Date().toLocaleString('hr-HR')}</p>

      <div className="my-8 p-6 bg-primary/10 rounded-xl border-2 border-primary/20">
        <h2 className="text-xl font-bold text-primary text-center tracking-tight mb-4">Ukupni Sažetak</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-primary/80 uppercase tracking-wider">Broj Faktura</p>
            <p className="text-2xl font-bold text-primary">{successfulFiles.length}</p>
          </div>
          <div>
            <p className="text-sm text-primary/80 uppercase tracking-wider">Ukupna Osnovica</p>
            <p className="text-2xl font-bold text-primary">{totals.base.toFixed(2)} {currency}</p>
          </div>
          <div>
            <p className="text-sm text-primary/80 uppercase tracking-wider">Ukupni PDV</p>
            <p className="text-2xl font-bold text-primary">{totals.vat.toFixed(2)} {currency}</p>
          </div>
        </div>
      </div>
      
      <h3 className="font-bold text-slate-600 border-b pb-1 mb-2 mt-8">Pojedinačne Stavke</h3>
      <table className="w-full text-left mb-6">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2 font-semibold">Dobavljač</th>
            <th className="p-2 font-semibold">Broj fakture</th>
            <th className="p-2 font-semibold">Datum</th>
            <th className="p-2 text-right font-semibold">Osnovica ({currency})</th>
            <th className="p-2 text-right font-semibold">PDV ({currency})</th>
            <th className="p-2 text-right font-semibold">Ukupno ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {successfulFiles.map(file => file.data && (
            <tr key={file.id} className="border-b border-slate-200">
              <td className="p-2">{file.data.supplier.name}</td>
              <td className="p-2">{file.data.invoice.invoice_number}</td>
              <td className="p-2">{file.data.invoice.invoice_date}</td>
              <td className="p-2 text-right">{file.data.calculations.commission_base.toFixed(2)}</td>
              <td className="p-2 text-right">{file.data.calculations.vat_amount.toFixed(2)}</td>
              <td className="p-2 text-right">{file.data.calculations.commission_total_with_vat.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="p-2" colSpan={3}>UKUPNO</td>
            <td className="p-2 text-right">{totals.base.toFixed(2)}</td>
            <td className="p-2 text-right">{totals.vat.toFixed(2)}</td>
            <td className="p-2 text-right">{totals.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 text-xs text-slate-400 text-center border-t pt-4">
        <p>Ovo je informativni izračun generiran pomoću AI. Za konačni porezni savjet, molimo konzultirajte svog računovođu.</p>
      </div>
    </div>
  );
};
