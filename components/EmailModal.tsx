import React, { useState, useEffect } from 'react';
import { IconMail, IconLoader } from './Icons';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (details: { email: string; reportType: 'summary' | 'all' }) => void;
    isSending: boolean;
}

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSend, isSending }) => {
    const [email, setEmail] = useState('');
    const [reportType, setReportType] = useState<'summary' | 'all'>('summary');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setReportType('summary');
            setError('');
        }
    }, [isOpen]);

    const validateEmail = (emailToValidate: string): boolean => {
        if (!emailToValidate.trim()) {
            setError('Molimo unesite email adresu.');
            return false;
        }
        // A more robust regex for email validation
        const emailRegex = new RegExp(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
        if (!emailRegex.test(emailToValidate)) {
            setError('Molimo unesite ispravnu email adresu.');
            return false;
        }
        setError('');
        return true;
    };

    const handleSendClick = () => {
        if (validateEmail(email)) {
            onSend({ email, reportType });
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        // Clear error on change for better UX
        if (error) {
            setError('');
        }
    };
    
    const handleEmailBlur = () => {
        // Validate only if there is some input, to avoid showing error on tabbing through empty field
        if (email) {
            validateEmail(email);
        }
    };

    if (!isOpen) return null;

    const inputClassName = `block w-full rounded-md pl-10 focus:ring-primary sm:text-sm p-2.5 dark:bg-slate-700 dark:border-border dark:text-text dark:placeholder-slate-400 ${
        error 
        ? 'border-red-500 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:text-red-300 dark:placeholder-red-400' 
        : 'border-border focus:border-primary'
    }`;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-md m-4 p-6 sm:p-8"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-text">Slanje izvještaja emailom</h2>
                        <p className="text-sm text-text-secondary mt-1">Odaberite vrstu izvještaja i unesite email primatelja.</p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text">Email adresa primatelja</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <IconMail className={`h-5 w-5 ${error ? 'text-red-500' : 'text-slate-400'}`} aria-hidden="true" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                className={inputClassName}
                                placeholder="primjer@domena.com"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={handleEmailBlur}
                                disabled={isSending}
                                aria-invalid={!!error}
                                aria-describedby="email-error"
                            />
                        </div>
                         {error && <p id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                    </div>
                    
                    <div>
                         <label className="block text-sm font-medium text-text mb-2">Vrsta izvještaja</label>
                         <fieldset className="grid grid-cols-2 gap-2">
                            <legend className="sr-only">Odaberite vrstu izvještaja</legend>
                            <div>
                                <input type="radio" name="reportType" id="summary" value="summary" checked={reportType === 'summary'} onChange={() => setReportType('summary')} className="sr-only peer" disabled={isSending} />
                                <label htmlFor="summary" className="flex flex-col items-center justify-center text-center p-3 border border-border rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 dark:peer-checked:bg-primary/20 peer-checked:text-primary dark:peer-checked:text-primary hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <span className="font-semibold">Zbirni izvještaj</span>
                                    <span className="text-xs text-text-secondary">Jedan PDF sa sažetkom</span>
                                </label>
                            </div>
                             <div>
                                <input type="radio" name="reportType" id="all" value="all" checked={reportType === 'all'} onChange={() => setReportType('all')} className="sr-only peer" disabled={isSending} />
                                <label htmlFor="all" className="flex flex-col items-center justify-center text-center p-3 border border-border rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 dark:peer-checked:bg-primary/20 peer-checked:text-primary dark:peer-checked:text-primary hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <span className="font-semibold">Svi izvještaji</span>
                                    <span className="text-xs text-text-secondary">Spojeni pojedinačni PDF-ovi</span>
                                </label>
                            </div>
                         </fieldset>
                    </div>

                    <div className="text-xs text-text-secondary p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <strong>Napomena:</strong> Klikom na "Kreiraj i pošalji" pokrenut će se preuzimanje PDF datoteke. Nakon toga, otvorit će se Vaš email klijent. <strong>Morate ručno priložiti preuzetu datoteku u email.</strong>
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-semibold text-text bg-white border border-border rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                        onClick={onClose}
                        disabled={isSending}
                    >
                        Odustani
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary border border-transparent rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                        onClick={handleSendClick}
                        disabled={isSending}
                    >
                        {isSending ? (
                            <>
                                <IconLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                Pripremam...
                            </>
                        ) : (
                            'Kreiraj i pošalji'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};