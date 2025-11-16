import React from 'react';
import type { ProcessedFile } from '../types';

interface SummaryReportProps {
  files: ProcessedFile[];
}

export const SummaryReport: React.FC<SummaryReportProps> = ({ files }) => {
  const successfulFiles = files.filter(f => f.status === 'success' && f.data);
  if (successfulFiles.length === 0) {
    return <div className="p-8">Nema uspješno obrađenih faktura za prikaz sažetka.</div>;
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
  const buyer = successfulFiles[0].data?.buyer;

  return (
    <div className="report-content-wrapper p-8 font-sans text-sm text-text bg-white dark:bg-card">
      <h1 className="text-2xl font-bold mb-2 text-primary">Zbirni Izvještaj o Obradi Faktura</h1>
      <p className="text-text-secondary mb-6">Generirano: {new Date().toLocaleString('hr-HR')}</p>

       <div className="my-8 p-6 bg-primary/10 rounded-xl border-2 border-primary/20">
            <p className="text-base font-semibold text-primary/80 uppercase tracking-widest text-center mb-2">Objekt</p>
            <h2 className="text-3xl font-bold text-primary text-center tracking-tight">{buyer?.name}</h2>
            <p className="text-center text-primary/90 mt-1">{buyer?.address} | OIB: {buyer?.vat_id.replace('HR','')}</p>
        </div>
      
      <h3 className="font-bold text-slate-600 dark:text-slate-300 border-b pb-1 mb-2 mt-8">Pojedinačne Stavke</h3>
      <table className="w-full text-left mb-6">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-700/50">
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
            <tr key={file.id} className="border-b border-border">
              <td className="p-2">{file.data.supplier.name}</td>
              <td className="p-2">{file.data.invoice.invoice_number}</td>
              <td className="p-2">{file.data.invoice.invoice_date}</td>
              <td className="p-2 text-right">{file.data.calculations.commission_base.toFixed(2)}</td>
              <td className="p-2 text-right">{file.data.calculations.vat_amount.toFixed(2)}</td>
              <td className="p-2 text-right">{file.data.calculations.commission_total_with_vat.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bg-slate-200 dark:bg-slate-700 font-bold">
            <td className="p-2" colSpan={3}>UKUPNO</td>
            <td className="p-2 text-right">{totals.base.toFixed(2)}</td>
            <td className="p-2 text-right">{totals.vat.toFixed(2)}</td>
            <td className="p-2 text-right">{totals.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 text-xs text-text-secondary text-center border-t pt-4">
        <p>Ovo je informativni izračun generiran pomoću AI. Za konačni porezni savjet, molimo konzultirajte svog računovođu.</p>
      </div>
    </div>
  );
};

// --- New Content Components ---

export const PdvStatementContent: React.FC<SummaryReportProps> = ({ files }) => {
    const successfulFiles = files.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return <div className="p-8">Nema podataka za generiranje izjave.</div>;
    const buyer = successfulFiles[0].data!.buyer;
    const supplier = successfulFiles[0].data!.supplier;

    return (
        <div className="report-content-wrapper p-8 font-serif text-base leading-relaxed text-black bg-white">
            <div className="text-right mb-12">
                <p><strong>{buyer.name}</strong></p>
                <p>{buyer.address}</p>
                <p>OIB: {buyer.vat_id.replace('HR', '')}</p>
            </div>
            <div className="text-left mb-12">
                <p>Porezna uprava</p>
                <p>N/R nadležne ispostave</p>
            </div>

            <h1 className="text-2xl font-bold text-center my-10 uppercase tracking-wider">
                Izjava o obračunu PDV-a na usluge inozemnog dobavljača
            </h1>

            <p className="mb-6">
                <strong>Predmet:</strong> Objašnjenje metode obračuna PDV-a na fakture primljene od {supplier.name}.
            </p>
            
            <p className="mb-6">
                Poštovani,
            </p>

            <p className="mb-6 indent-8">
                Ovom izjavom, pod materijalnom i kaznenom odgovornošću, izjavljujemo da smo za primljene usluge posredovanja pri rezervacijama od tvrtke <strong>{supplier.name}</strong>, sa sjedištem na adresi {supplier.address}, PDV ID: {supplier.vat_id}, izvršili obračun PDV-a primjenom mehanizma prijenosa porezne obveze (eng. <i>reverse charge</i>).
            </p>
            
            <p className="mb-6 indent-8">
                Obračun je izvršen sukladno <strong>članku 17. stavku 1. Zakona o porezu na dodanu vrijednost</strong> (NN 73/13, 99/13, 148/13, 153/13, 143/14, 115/16, 106/18, 121/19, 138/20, 39/22, 113/22, 33/23, 132/23), koji propisuje da je mjesto oporezivanja usluga koje se obavljaju između dva porezna obveznika (B2B) mjesto gdje primatelj usluge ima sjedište svoje djelatnosti. Budući da je sjedište naše tvrtke u Republici Hrvatskoj, a primatelji smo usluge od poreznog obveznika iz druge države članice EU, u obvezi smo obračunati i platiti hrvatski PDV.
            </p>
            
            <p className="mb-6 indent-8">
                Naglašavamo da <strong>osnovica za obračun PDV-a</strong> uključuje isključivo iznos provizije za usluge posredovanja, kako je specificirano na pripadajućim fakturama pod stavkom "Provizija" ili "Commission". Eventualne ostale stavke na fakturama, kao što su naknade za obradu plaćanja ili druge bankarske naknade, ne predstavljaju naknadu za uslugu pruženu našoj tvrtki, već se smatraju troškovima platnog prometa ili prolaznim stavkama. Stoga, te stavke sukladno poreznim propisima ne ulaze u osnovicu za obračun PDV-a na temeljnu uslugu posredovanja.
            </p>
            
            <p className="mb-6">
                S poštovanjem,
            </p>

            <div className="mt-20">
                <p>U ____________________, dana {new Date().toLocaleDateString('hr-HR')}.</p>
                <div className="mt-16 border-t border-gray-400 w-64">
                    <p className="mt-2">{buyer.name}, potpis</p>
                </div>
            </div>
        </div>
    );
};

export const PdvInstructionsContent: React.FC = () => (
    <div className="report-content-wrapper p-8 font-sans text-sm text-text bg-white dark:bg-card">
        <h1 className="text-2xl font-bold mb-2 text-primary">Upute za Popunjavanje PDV i PDV-S Obrasca putem e-Porezne</h1>
        <p className="text-text-secondary mb-8">Vodič za ispravan unos podataka o uslugama primljenim iz EU.</p>

        <div className="space-y-6">
            <section>
                <h2 className="text-xl font-semibold text-slate-800 border-b-2 border-primary/50 pb-2 mb-3">Korak 1: Popunjavanje Obrasca PDV-S</h2>
                <p className="mb-2">Obrazac PDV-S služi za prijavu stjecanja dobara i usluga iz drugih država članica EU. Popunjava se za mjesec u kojem je usluga primljena (prema datumu fakture).</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                    <li>Prijavite se u sustav <strong>e-Porezna</strong> koristeći svoju vjerodajnicu.</li>
                    <li>U izborniku odaberite "Obrasci", a zatim pronađite i otvorite <strong>"Obrazac PDV-S"</strong>.</li>
                    <li>Odaberite ispravno razdoblje (mjesec i godina) za koje podnosite prijavu.</li>
                    <li>U tablici za unos podataka, popunite retke na sljedeći način:
                        <ul className="list-disc list-inside space-y-1 mt-2 pl-6 bg-slate-50 p-3 rounded-md">
                           <li><strong>Stupac 4 (Vrsta stjecanja):</strong> Odaberite oznaku <strong>"a)"</strong> - Stjecanje usluga iz čl. 17. st. 1. Zakona.</li>
                           <li><strong>Stupac 6 (PDV ID broj ili OIB dobavljača):</strong> Upišite PDV identifikacijski broj dobavljača (npr. Booking.com B.V.), bez slovne oznake države (npr. upisujete samo brojeve iz `NLxxxxxxxxxxB01`).</li>
                           <li><strong>Stupac 8 (Vrijednost primljenih usluga):</strong> Upišite <strong>ukupnu osnovicu</strong> za sve fakture u tom mjesecu. Ovu vrijednost možete pronaći u "Zbirnom izvještaju" pod "Ukupna Osnovica".</li>
                        </ul>
                    </li>
                    <li>Ako ste u istom mjesecu imali usluge od više EU dobavljača, dodajte novi redak za svakog od njih.</li>
                    <li>Provjerite unesene podatke i kliknite "Podnesi obrazac".</li>
                </ol>
            </section>
            <section>
                <h2 className="text-xl font-semibold text-slate-800 border-b-2 border-primary/50 pb-2 mb-3">Korak 2: Popunjavanje Glavnog Obrasca PDV</h2>
                 <p className="mb-2">Nakon podnošenja Obrasca PDV-S, podaci se prenose u glavni Obrazac PDV. Ovdje se primjenjuje mehanizam prijenosa porezne obveze, što rezultira neutralnim poreznim efektom.</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                    <li>U sustavu e-Porezna, otvorite <strong>"Obrazac PDV"</strong> za isto porezno razdoblje.</li>
                    <li>Podaci koje ste unijeli u PDV-S obrazac trebali bi se automatski odraziti na sljedećim pozicijama:
                        <ul className="list-disc list-inside space-y-1 mt-2 pl-6 bg-slate-50 p-3 rounded-md">
                           <li><strong>Polje II.1.3. (Stjecanje dobara i usluga iz drugih država članica EU):</strong> Ovdje se upisuje <strong>ukupna osnovica</strong> (isti iznos kao u stupcu 8 Obrasca PDV-S).</li>
                           <li><strong>Polje III.1.3. (Obračunati pretporez na stjecanje...):</strong> Ovdje se upisuje <strong>iznos obračunatog PDV-a</strong> na tu osnovicu (Osnovica * 25%). Ovaj iznos predstavlja vašu obvezu za PDV.</li>
                        </ul>
                    </li>
                     <li><strong>KLJUČNI KORAK:</strong> Isti iznos PDV-a koji je upisan u polje III.1.3. kao obveza, priznaje se i kao pretporez. Sustav bi trebao automatski popuniti i odgovarajuća polja za priznanje pretporeza, čime se obveza i pravo na odbitak poništavaju. Neto efekt na vašu uplatu PDV-a je nula (0).</li>
                    <li>Popunite ostatak PDV obrasca s podacima o domaćim transakcijama, ako ih imate.</li>
                    <li>Provjerite cijeli obrazac i podnesite ga.</li>
                </ol>
            </section>
        </div>
        <div className="mt-8 text-xs text-text-secondary text-center border-t pt-4">
            <p>Ove upute su informativnog karaktera. Za sva specifična pitanja i porezno savjetovanje, obratite se svom računovođi ili nadležnoj ispostavi Porezne uprave.</p>
        </div>
    </div>
);

export const PdvFormsContent: React.FC<SummaryReportProps> = ({ files }) => {
    const successfulFiles = files.filter(f => f.status === 'success' && f.data);
    if (successfulFiles.length === 0) return <div className="p-8">Nema podataka za generiranje obrazaca.</div>;
    
    const totals = successfulFiles.reduce((acc, curr) => {
        if (curr.data) {
          acc.base += curr.data.calculations.commission_base;
          acc.vat += curr.data.calculations.vat_amount;
        }
        return acc;
    }, { base: 0, vat: 0 });

    const buyer = successfulFiles[0].data!.buyer;
    const supplier = successfulFiles[0].data!.supplier;
    const latestPeriodFile = successfulFiles.reduce((latest, current) => 
        new Date(latest.data!.invoice.service_period_to) > new Date(current.data!.invoice.service_period_to) ? latest : current
    );
    const period = latestPeriodFile.data!.invoice.service_period_to; // e.g., "2024-05-31"
    const periodFormatted = period ? `${period.substring(5, 7)}/${period.substring(0, 4)}` : ''; // "05/2024"
    const oib = buyer.vat_id.replace('HR', '');

    const Field = ({ label, value, className = '' }: {label: string, value: string | number, className?: string}) => (
        <div className={`border border-black p-1 ${className}`}>
            <div className="text-[7pt]">{label}</div>
            <div className="text-[10pt] font-bold text-right h-6 pr-1">{value}</div>
        </div>
    );

    return (
        <div className="report-content-wrapper p-4 font-sans text-sm text-black bg-white space-y-8">
            {/* PDV-S Form */}
            <div className="border-2 border-black p-2">
                <div className="text-center">
                    <h2 className="text-xl font-bold">Obrazac PDV-S</h2>
                    <p className="text-sm font-semibold">Prijava za stjecanje dobara i primljene usluge iz drugih država članica Europske unije</p>
                </div>
                <div className="grid grid-cols-3 gap-2 my-4 text-sm">
                    <div className="border border-black p-1"><strong>Porezni obveznik:</strong> {buyer.name}, {buyer.address}</div>
                    <div className="border border-black p-1"><strong>OIB:</strong> {oib}</div>
                    <div className="border border-black p-1"><strong>Razdoblje:</strong> {periodFormatted}</div>
                </div>
                <table className="w-full border-collapse border border-black text-xs text-center">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-1 w-[5%]">Red. br.</th>
                            <th className="border border-black p-1 w-[5%]">Vrsta stjecanja</th>
                            <th className="border border-black p-1 w-[40%]">Naziv i adresa dobavljača</th>
                            <th className="border border-black p-1 w-[20%]">PDV ID / OIB</th>
                            <th className="border border-black p-1 w-[20%]">Vrijednost (EUR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-1">1.</td>
                            <td className="border border-black p-1 font-bold">a)</td>
                            <td className="border border-black p-1 text-left">{supplier.name}, {supplier.address}</td>
                            <td className="border border-black p-1">{supplier.vat_id}</td>
                            <td className="border border-black p-1 text-right font-mono">{totals.base.toFixed(2)}</td>
                        </tr>
                         <tr><td className="h-8 border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                         <tr><td className="h-8 border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
                    </tbody>
                </table>
                 <div className="text-right mt-2"><strong className="text-sm">UKUPNO (a): {totals.base.toFixed(2)} EUR</strong></div>
            </div>

            {/* PDV Form */}
            <div className="border-2 border-black p-2">
                <div className="text-center">
                    <h2 className="text-xl font-bold">Obrazac PDV (Izdvojeni dio)</h2>
                    <p className="text-sm font-semibold">Prijava poreza na dodanu vrijednost</p>
                </div>
                <div className="grid grid-cols-3 gap-2 my-4 text-sm">
                    <div className="border border-black p-1"><strong>Porezni obveznik:</strong> {buyer.name}</div>
                    <div className="border border-black p-1"><strong>OIB:</strong> {oib}</div>
                    <div className="border border-black p-1"><strong>Razdoblje:</strong> {periodFormatted}</div>
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-bold bg-gray-200 p-1 border border-black">II. OPOREZIVE TRANSAKCIJE</h3>
                        <div className="grid grid-cols-[3fr,1fr] text-xs">
                             <div className="border border-black p-1 font-bold">II.1. Oporezive isporuke (osim izvoza) i primljeni predujmovi...</div>
                             <Field label="" value="" />
                             <div className="border border-black p-1 pl-4">1.1. Isporuke dobara i usluga po stopi 5%</div>
                             <Field label="Osnovica" value="0.00" />
                             <div className="border border-black p-1 pl-4">1.2. Isporuke dobara i usluga po stopi 13%</div>
                             <Field label="Osnovica" value="0.00" />
                             <div className="border border-black p-1 pl-4 bg-yellow-200">1.3. Stjecanje dobara i usluga iz drugih država članica EU</div>
                             <Field label="Osnovica (EUR)" value={totals.base.toFixed(2)} className="bg-yellow-200" />
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-bold bg-gray-200 p-1 border border-black">III. PRETPOREZ</h3>
                         <div className="grid grid-cols-[3fr,1fr] text-xs">
                             <div className="border border-black p-1 font-bold">III.1. Pretporez na nabavu dobara i usluga (osim uvoza)</div>
                             <Field label="" value="" />
                             <div className="border border-black p-1 pl-4">1.1. Pretporez od primljenih isporuka po stopi 5%</div>
                             <Field label="Pretporez (EUR)" value="0.00" />
                             <div className="border border-black p-1 pl-4">1.2. Pretporez od primljenih isporuka po stopi 13%</div>
                             <Field label="Pretporez (EUR)" value="0.00" />
                             <div className="border border-black p-1 pl-4 bg-yellow-200">1.3. Pretporez na stjecanja i uvoz (po stopi 25%)</div>
                             <Field label="Pretporez (EUR)" value={totals.vat.toFixed(2)} className="bg-yellow-200" />
                        </div>
                    </div>
                    <div className="text-center p-4 border border-dashed border-black">
                        <p>...</p>
                        <p className="font-semibold">Prikazani su samo dijelovi Obrasca PDV relevantni za prijenos porezne obveze.</p>
                        <p className="text-xs mt-2">Ukupna obveza za PDV (iz polja II) i pravo na pretporez (iz polja III) se međusobno poništavaju, što rezultira neutralnim poreznim efektom.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
