import React from 'react';
import QRCode from 'react-qr-code';

export const IconBook: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

export const IconLoader: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export const IconAlertTriangle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  </svg>
);

export const IconUpload: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

export const IconFile: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

export const IconDownload: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

export const IconClipboard: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

export const IconPencil: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

export const IconCheckCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14 9 11"/>
  </svg>
);

export const IconPrinter: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </svg>
);

export const IconChevronDown: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export const IconInfo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export const IconMail: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

export const IconLayers: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

export const IconBarcode: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 5v14"/>
        <path d="M8 5v14"/>
        <path d="M12 5v14"/>
        <path d="M17 5v14"/>
        <path d="M21 5v14"/>
    </svg>
);

export const IconCode: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

export const IconSun: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);

export const IconMoon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);


// --- Payment Slip Component ---
// This component is placed here as a shared utility to be used across the app
// for generating payment slips, avoiding the need for new files under current constraints.

interface PaymentSlipProps {
  payerName: string;
  payerAddress: string;
  recipientName: string;
  recipientAddress: string;
  recipientIban: string;
  amount: number;
  currency: string;
  model: string;
  pozivNaBroj: string;
  sifraNamjene: string;
  opisPlacanja: string;
}

const formatAmountForHub = (amount: number): string => {
  return amount.toFixed(2).replace('.', ',');
};

const cleanStringForHub = (str: string, maxLength: number): string => {
    if (!str) return '';
    const replacements: { [key: string]: string } = {
        'Č': 'C', 'č': 'c', 'Ć': 'C', 'ć': 'c',
        'Đ': 'D', 'đ': 'd', 'Š': 'S', 'š': 's',
        'Ž': 'Z', 'ž': 'z'
    };
    let cleaned = str.replace(/[ČčĆćĐđŠšŽž]/g, c => replacements[c] || c);
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,-]/g, '');
    return cleaned.substring(0, maxLength);
};

export const PaymentSlip: React.FC<PaymentSlipProps> = (props) => {
    const {
        payerName, payerAddress, recipientName, recipientAddress, recipientIban,
        amount, currency, model, pozivNaBroj, sifraNamjene, opisPlacanja
    } = props;

    // Split address into street and city for HUB3A standard which has separate fields
    const [payerStreet = '', ...payerCityParts] = (payerAddress || '').split(',');
    const payerCity = payerCityParts.join(',').trim();

    const [recipientStreet = '', ...recipientCityParts] = (recipientAddress || '').split(',');
    const recipientCity = recipientCityParts.join(',').trim();

    const hub3aData = [
        'HRK',
        'HUB3A',
        'UTF-8',
        'EUR',
        formatAmountForHub(amount),
        cleanStringForHub(payerName, 25),
        cleanStringForHub(payerStreet, 25),
        cleanStringForHub(payerCity, 27),
        cleanStringForHub(recipientName, 25),
        cleanStringForHub(recipientStreet, 25),
        cleanStringForHub(recipientCity, 27),
        recipientIban,
        model,
        pozivNaBroj,
        sifraNamjene,
        cleanStringForHub(opisPlacanja, 35),
        ''
    ].join('\n');

    const formattedAmount = new Intl.NumberFormat('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    return (
      <div className="bg-white p-4 font-mono text-[9pt] border border-black" style={{ width: '180mm', height: '80mm' }}>
        <h2 className="text-center font-bold text-[11pt] mb-2">NALOG ZA NACIONALNA PLAĆANJA</h2>
        <div className="grid grid-cols-[1fr_1fr] gap-x-4">
          <div>
            <div className="flex">
              <div className="w-[120px] h-[120px] flex flex-col items-center justify-center">
                <div style={{ background: 'white', padding: '4px' }}>
                    <QRCode
                        value={hub3aData}
                        size={112}
                        level="M"
                        viewBox={`0 0 112 112`}
                    />
                </div>
                <p className="text-[7pt] text-center">BKOD</p>
              </div>
              <div className="flex-1 pl-2">
                <div className="border-b border-black pb-1 mb-1 h-[3em]">
                  <label className="block text-[7pt]">IBAN platitelja</label>
                  <span>&nbsp;</span>
                </div>
                <div className="border-b border-black pb-1 h-[3em]">
                  <label className="block text-[7pt]">Model i poziv na broj platitelja</label>
                   <span>&nbsp;</span>
                </div>
              </div>
            </div>
            <div className="border-b border-black pb-1 mt-1 h-[3.5em]">
              <label className="block text-[7pt]">Platitelj</label>
              <p className="text-[8pt]">{payerName}</p>
              <p className="text-[8pt]">{payerAddress}</p>
            </div>
             <div className="border-b border-black pb-1 mt-1 h-[3.5em]">
              <label className="block text-[7pt]">Primatelj</label>
              <p className="text-[8pt]">{recipientName}</p>
              <p className="text-[8pt]">{recipientAddress}</p>
            </div>
          </div>
          <div>
             <div className="flex">
                <div className="border-b border-black pb-1 w-[40mm]">
                    <label className="block text-[7pt]">Valuta plaćanja</label>
                    <p className="font-bold">{currency}</p>
                </div>
                <div className="border-b border-black pb-1 flex-1">
                    <label className="block text-[7pt]">Iznos</label>
                    <p className="font-bold text-right">{formattedAmount}</p>
                </div>
             </div>
             <div className="border-b border-black pb-1 mt-1 h-[3em]">
                <label className="block text-[7pt]">IBAN primatelja</label>
                <p>{recipientIban}</p>
             </div>
             <div className="flex">
                <div className="border-b border-black pb-1 mt-1 w-[40mm]">
                    <label className="block text-[7pt]">Model</label>
                    <p>{model}</p>
                </div>
                <div className="border-b border-black pb-1 mt-1 flex-1">
                    <label className="block text-[7pt]">Poziv na broj primatelja</label>
                    <p>{pozivNaBroj}</p>
                </div>
             </div>
             <div className="border-b border-black pb-1 mt-1 h-[2em]">
                <label className="block text-[7pt]">Šifra namjene</label>
                <p>{sifraNamjene}</p>
             </div>
             <div className="border-b border-black pb-1 mt-1 h-[4.5em] overflow-hidden">
                <label className="block text-[7pt]">Opis plaćanja</label>
                <p className="text-[8pt]">{opisPlacanja}</p>
             </div>
              <div className="text-right mt-2">
                <p className="text-[7pt]">Datum izvršenja</p>
              </div>
          </div>
        </div>
      </div>
    );
};