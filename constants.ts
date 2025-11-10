import { Type } from '@google/genai';

export const INVOICE_SYSTEM_PROMPT = `
**ULOGA I SVRHA:**
Ti si visoko specijalizirani AI asistent za automatsku obradu i ekstrakciju podataka iz PDF faktura za potrebe hrvatskog PDV sustava. Tvoja jedina svrha je precizno parsirati podatke iz dostavljene fakture i strukturirati ih u JSON formatu prema zadanoj shemi. Fokusiraj se isključivo na podatke relevantne za obračun PDV-a po načelu prijenosa porezne obveze (reverse charge).

**PRAVILA (OBAVEZNO):**
1.  **FORMAT JE FIKSAN:** Tvoj izlaz mora biti ISKLJUČIVO JSON objekt koji u potpunosti odgovara priloženoj JSON shemi. Nemoj dodavati nikakve uvodne rečenice, objašnjenja ili bilješke izvan JSON strukture.
2.  **PODACI MORAJU BITI TOČNI:** Ekstrahiraj podatke točno onako kako su navedeni na fakturi. Datume formatiraj kao YYYY-MM-DD. Numeričke vrijednosti moraju biti brojevi (ne stringovi), koristeći točku kao decimalni separator.
3.  **REVERSE CHARGE:** Glavni zadatak je izračunati hrvatski PDV na temelju provizije ili usluge navedene na fakturi. Pretpostavi standardnu stopu PDV-a od 25% osim ako na fakturi nije izričito navedeno drugačije za tu vrstu usluge u HR.
4.  **VALIDACIJA EU VAT ID-a:** Polje 'is_eu_vat_valid' postavi na 'true' ako VAT ID dobavljača ima prefiks neke od EU zemalja (npr. IE, DE, NL). U suprotnom, postavi na 'false'.
5.  **UPUTE ZA PDV OBRAZAC:** U polje 'instructions_for_pdv_form' generiraj kratke, jasne upute za unos podataka u standardni hrvatski PDV obrazac. Upute moraju specificirati točna polja (npr. II.12, III.12) i iznose koje treba upisati.
6.  **NEPOZNATI PODACI:** Ako neki podatak nije moguće pronaći na fakturi, koristi 'null' za taj ključ. Za nizove (npr. 'line_items'), vrati prazan niz []. Za polje 'errors', navedi koja polja nisu mogla biti pronađena.
7.  **META PODACI:**
    *   'parsed_at': Postavi na trenutni ISO 8601 datum i vrijeme (UTC).
    *   'source_file': Navedi ime originalne datoteke.
    *   'parser_version': Postavi na "1.0.0".
    *   'audit_hash': Generiraj SHA256 hash na temelju sadržaja fakture (ovo je hipotetski, samo vrati placeholder string "audit_hash_placeholder").
`;

export const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    meta: {
      type: Type.OBJECT,
      properties: {
        parsed_at: { type: Type.STRING, description: "ISO 8601 timestamp of parsing." },
        source_file: { type: Type.STRING, description: "Original filename." },
        parser_version: { type: Type.STRING, description: "Version of the parser." },
        audit_hash: { type: Type.STRING, description: "A unique hash for auditing." },
      },
      required: ["parsed_at", "source_file", "parser_version", "audit_hash"],
    },
    supplier: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Supplier's full name." },
        address: { type: Type.STRING, description: "Supplier's full address." },
        vat_id: { type: Type.STRING, description: "Supplier's VAT identification number." },
        is_eu_vat_valid: { type: Type.BOOLEAN, description: "Is the supplier's VAT ID a valid EU VAT ID." },
      },
      required: ["name", "address", "vat_id", "is_eu_vat_valid"],
    },
    buyer: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Buyer's full name." },
            address: { type: Type.STRING, description: "Buyer's full address." },
            vat_id: { type: Type.STRING, description: "Buyer's VAT identification number (if available).", nullable: true },
        },
        required: ["name", "address"],
    },
    invoice: {
      type: Type.OBJECT,
      properties: {
        invoice_number: { type: Type.STRING, description: "The unique invoice number." },
        invoice_date: { type: Type.STRING, description: "Date of invoice issuance (YYYY-MM-DD)." },
        service_period_from: { type: Type.STRING, description: "Start date of the service period (YYYY-MM-DD)." },
        service_period_to: { type: Type.STRING, description: "End date of the service period (YYYY-MM-DD)." },
        currency: { type: Type.STRING, description: "Currency of the invoice (e.g., EUR, USD)." },
      },
      required: ["invoice_number", "invoice_date", "currency"],
    },
    line_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Description of the service or product." },
          amount: { type: Type.NUMBER, description: "The amount for the line item." },
        },
        required: ["description", "amount"],
      },
    },
    calculations: {
      type: Type.OBJECT,
      properties: {
        commission_base: { type: Type.NUMBER, description: "The base amount for VAT calculation (usually the total before VAT)." },
        vat_rate_percent: { type: Type.NUMBER, description: "The VAT rate applied in percentage (e.g., 25)." },
        vat_amount: { type: Type.NUMBER, description: "The calculated VAT amount." },
        commission_total_with_vat: { type: Type.NUMBER, description: "The total amount including the calculated VAT." },
        notes: { type: Type.STRING, description: "Any notes regarding the calculation." },
      },
      required: ["commission_base", "vat_rate_percent", "vat_amount", "commission_total_with_vat"],
    },
    actions: {
        type: Type.OBJECT,
        properties: {
            reverse_charge_applies: { type: Type.BOOLEAN, description: "True if the reverse charge mechanism applies." },
            instructions_for_pdv_form: { type: Type.STRING, description: "Clear instructions for filling out the Croatian PDV form." },
            manual_review_required: { type: Type.BOOLEAN, description: "True if any data is uncertain or missing, requiring manual review." },
        },
        required: ["reverse_charge_applies", "instructions_for_pdv_form", "manual_review_required"],
    },
    errors: {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        },
        description: "A list of errors or missing fields encountered during parsing."
    }
  },
  required: ["meta", "supplier", "buyer", "invoice", "line_items", "calculations", "actions", "errors"],
};
