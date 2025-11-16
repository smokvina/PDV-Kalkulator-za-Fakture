// @google/genai v0.12.0
import { Type } from '@google/genai';

export const INVOICE_SYSTEM_PROMPT = `**SISTEMSKE UPUTE ZA PARSIRANJE FAKTURA**

**ULOGA I SVRHA:**
* Ti si visoko specijalizirani AI za automatsku obradu i parsiranje PDF faktura za hrvatsku tvrtku, obveznika PDV-a.
* Tvoja jedina svrha je precizno izvući podatke iz fakture, izračunati PDV prema mehanizmu prijenosa porezne obveze (reverse charge) i generirati strukturirani JSON izlaz.

**OBAVEZNA PRAVILA:**

1.  **STRIKTNO PREMA SHEMI:** Tvoj izlaz mora biti ISKLJUČIVO validan JSON objekt koji se u potpunosti pridržava zadane \`responseSchema\`. Ne dodaji nikakve dodatne komentare, objašnjenja ili markdown formatiranje izvan JSON-a. SVA OBAVEZNA POLJA MORAJU BITI POPUNJENA.
2.  **IZRAČUN PDV-a (REVERSE CHARGE):**
    *   **Osnovica (\`commission_base\`):** Zbroj iznosa svih stavki čiji opis sadrži "Reservations" ili "Rezervacije".
    *   **Stopa PDV-a (\`vat_rate_percent\`):** Uvijek koristi **25**.
    *   **Iznos PDV-a (\`vat_amount\`):** Izračunaj kao \`commission_base * 0.25\`. Zaokruži na 2 decimale.
    *   **Ukupno s PDV-om (\`commission_total_with_vat\`):** Izračunaj kao \`commission_base + vat_amount\`. Zaokruži na 2 decimale.
3.  **UPUTE ZA PDV OBRAZAC (\`instructions_for_pdv_form\`):**
    *   Ako se primjenjuje prijenos porezne obveze (\`reverse_charge_applies: true\`), generiraj precizne upute za popunjavanje PDV obrasca. Upute moraju biti formatirane kao string koji sadrži nove retke (npr. pomoću \\n).
    *   **Predložak za upute (prilagodi iznose):**
        "UPUTE ZA PDV-OBRAZAC (Prijenos porezne obveze):\\n1. Osnovica (npr. 1000.00 EUR) upisuje se u polje II.1.3. 'Stjecanje dobara i usluga iz drugih država članica EU'.\\n2. Obračunati PDV (npr. 250.00 EUR) upisuje se u polje III.1.3. 'Obračunani pretporez na stjecanje'.\\n3. Isti iznos PDV-a priznaje se kao pretporez i upisuje u polje III.1.3., čime se postiže neutralan porezni efekt."
4.  **VALIDACIJA PODATAKA:**
    *   **PDV ID dobavljača (\`supplier.vat_id\`):** Provjeri je li to valjani EU VAT ID. Na temelju toga postavi \`is_eu_vat_valid\`.
    *   **PDV ID kupca (\`buyer.vat_id\`):** Pronađi i izvuci PDV identifikacijski broj (OIB) kupca. Primijeni pravilo 7 ako podatak nije dostupan.
    *   Ako je dobavljač iz EU, a kupac hrvatski porezni obveznik, postavi \`actions.reverse_charge_applies\` na \`true\`.
5.  **METADATA:**
    *   \`parsed_at\`: Trenutni datum i vrijeme u ISO 8601 formatu.
    *   \`source_file\`: Koristi originalni naziv datoteke. Ako ti nije poznat, ostavi prazno.
    *   \`parser_version\`: Postavi na "1.2-gemini-flash".
    *   \`audit_hash\`: Oстави празно.
6.  **UPRAVLJANJE GREŠKAMA:**
    *   Ako ne možeš pronaći ključne podatke (broj fakture, datumi, iznosi), dodaj jasan opis problema u \`errors\` polje (npr. "Nije moguće pronaći broj fakture.").
    *   Ako postoji bilo kakva nejasnoća, postavi \`manual_review_required\` na \`true\`.
7.  **PODACI KOJI NEDOSTAJU:** Ako obavezni podatak (kao što je \`buyer.vat_id\`) nije prisutan na fakturi, **MORAŠ** upisati string "Nije naveden" u odgovarajuće polje kako bi se zadovoljila JSON shema.`;

// Note: Descriptions are in English for clarity for the model,
// but the model should populate it with Croatian data from the invoice.
export const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    meta: {
      type: Type.OBJECT,
      description: 'Metadata about the parsing process.',
      properties: {
        parsed_at: { type: Type.STRING, description: 'ISO 8601 timestamp of when the parsing occurred.' },
        source_file: { type: Type.STRING, description: 'The original filename of the invoice PDF.' },
        parser_version: { type: Type.STRING, description: 'Version of the parsing model used.' },
        audit_hash: { type: Type.STRING, description: 'SHA256 hash of the document content for auditing. Can be empty.' },
      },
      required: ['parsed_at', 'source_file', 'parser_version', 'audit_hash']
    },
    supplier: {
      type: Type.OBJECT,
      description: 'Details about the invoice supplier.',
      properties: {
        name: { type: Type.STRING, description: 'Full legal name of the supplier.' },
        address: { type: Type.STRING, description: 'Full address of the supplier.' },
        vat_id: { type: Type.STRING, description: 'Supplier\'s VAT identification number.' },
        is_eu_vat_valid: { type: Type.BOOLEAN, description: 'Flag indicating if the supplier has a valid EU VAT ID.' },
      },
      required: ['name', 'address', 'vat_id', 'is_eu_vat_valid']
    },
    buyer: {
      type: Type.OBJECT,
      description: 'Details about the invoice buyer.',
      properties: {
        name: { type: Type.STRING, description: 'Full legal name of the buyer.' },
        address: { type: Type.STRING, description: 'Full address of the buyer.' },
        vat_id: { type: Type.STRING, description: 'Buyer\'s VAT identification number (OIB). If not present, use the string "Nije naveden".' },
      },
      required: ['name', 'address', 'vat_id']
    },
    invoice: {
      type: Type.OBJECT,
      description: 'Core details of the invoice document.',
      properties: {
        invoice_number: { type: Type.STRING, description: 'The unique identification number of the invoice.' },
        invoice_date: { type: Type.STRING, description: 'Date the invoice was issued, in YYYY-MM-DD format.' },
        service_period_from: { type: Type.STRING, description: 'Start date of the service period, in YYYY-MM-DD format.' },
        service_period_to: { type: Type.STRING, description: 'End date of the service period, in YYYY-MM-DD format.' },
        currency: { type: Type.STRING, description: 'Three-letter currency code (e.g., EUR, USD).' },
      },
      required: ['invoice_number', 'invoice_date', 'service_period_from', 'service_period_to', 'currency']
    },
    line_items: {
      type: Type.ARRAY,
      description: 'A list of all items billed on the invoice.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: 'Description of the service or product.' },
          amount: { type: Type.NUMBER, description: 'The cost of the line item.' },
        },
        required: ['description', 'amount']
      }
    },
    calculations: {
      type: Type.OBJECT,
      description: 'VAT calculation details based on reverse charge mechanism.',
      properties: {
        commission_base: { type: Type.NUMBER, description: 'The base amount for VAT calculation (sum of reservation items).' },
        vat_rate_percent: { type: Type.NUMBER, description: 'The VAT rate percentage applied (should be 25).' },
        vat_amount: { type: Type.NUMBER, description: 'The calculated amount of VAT.' },
        commission_total_with_vat: { type: Type.NUMBER, description: 'The total amount including the calculated VAT.' },
        notes: { type: Type.STRING, description: 'Any notes regarding the calculation, if necessary.' },
      },
      required: ['commission_base', 'vat_rate_percent', 'vat_amount', 'commission_total_with_vat', 'notes']
    },
    actions: {
      type: Type.OBJECT,
      description: 'Recommended actions and instructions.',
      properties: {
        reverse_charge_applies: { type: Type.BOOLEAN, description: 'Flag indicating if the reverse charge mechanism applies.' },
        instructions_for_pdv_form: { type: Type.STRING, description: 'Detailed instructions for filling the Croatian PDV form.' },
        manual_review_required: { type: Type.BOOLEAN, description: 'Flag indicating if the invoice requires manual review due to ambiguities.' },
      },
      required: ['reverse_charge_applies', 'instructions_for_pdv_form', 'manual_review_required']
    },
    errors: {
      type: Type.ARRAY,
      description: 'A list of errors encountered during parsing.',
      items: {
        type: Type.STRING,
      }
    }
  },
  required: ['meta', 'supplier', 'buyer', 'invoice', 'line_items', 'calculations', 'actions', 'errors']
};


export const PDV_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<ObrazacPDV verzijaSheme="10.0" xmlns="http://e-porezna.porezna-uprava.hr/sheme/zahtjevi/ObrazacPDV/v10-0">
    <Metapodaci xmlns="http://e-porezna.porezna-uprava.hr/sheme/Metapodaci/v2-0">
        <Naslov dc="http://purl.org/dc/elements/1.1/title">Prijava poreza na dodanu vrijednost</Naslov>
        <Autor dc="http://purl.org/dc/elements/1.1/creator">DENIS ORLIĆ</Autor>
        <Datum dc="http://purl.org/dc/elements/1.1/date">2025-11-16T14:22:50</Datum>
        <Format dc="http://purl.org/dc/elements/1.1/format">text/xml</Format>
        <Jezik dc="http://purl.org/dc/elements/1.1/language">hr-HR</Jezik>
        <Identifikator dc="http://purl.org/dc/elements/1.1/identifier">575392c7-5c3c-4102-8810-19e91859a84c</Identifikator>
        <Uskladjenost dc="http://purl.org/dc/terms/conformsTo">ObrazacPDV-v10-0</Uskladjenost>
        <Tip dc="http://purl.org/dc/elements/1.1/type">Elektronički obrazac</Tip>
        <Adresant>Ministarstvo Financija, Porezna uprava, Zagreb</Adresant>
    </Metapodaci>
    <Zaglavlje>
        <Razdoblje>
            <DatumOd>2025-10-01</DatumOd>
            <DatumDo>2025-10-31</DatumDo>
        </Razdoblje>
        <Obveznik>
            <Ime>SANDRA</Ime>
            <Prezime>ORLIĆ</Prezime>
            <OIB>63814718221</OIB>
            <Adresa>
                <Mjesto>SPLIT</Mjesto>
                <Ulica>POŽEŠKA</Ulica>
                <Broj>0018</Broj>
            </Adresa>
        </Obveznik>
        <ObracunSastavio>
            <Ime>DENIS</Ime>
            <Prezime>ORLIĆ</Prezime>
        </ObracunSastavio>
        <Ispostava>3421</Ispostava>
    </Zaglavlje>
    <Tijelo>
        <Podatak000>0.00</Podatak000>
        <Podatak100>0.00</Podatak100>
        <Podatak101>0.00</Podatak101>
        <Podatak102>0.00</Podatak102>
        <Podatak103>0.00</Podatak103>
        <Podatak104>0.00</Podatak104>
        <Podatak105>0.00</Podatak105>
        <Podatak106>0.00</Podatak106>
        <Podatak107>0.00</Podatak107>
        <Podatak108>0.00</Podatak108>
        <Podatak109>0.00</Podatak109>
        <Podatak110>0.00</Podatak110>
        <Podatak111>0.00</Podatak111>
        <Podatak200><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak200>
        <Podatak201><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak201>
        <Podatak202><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak202>
        <Podatak203><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak203>
        <Podatak204><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak204>
        <Podatak205><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak205>
        <Podatak206><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak206>
        <Podatak207><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak207>
        <Podatak208><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak208>
        <Podatak209><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak209>
        <Podatak210><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak210>
        <Podatak211><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak211>
        <Podatak212><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak212>
        <Podatak213><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak213>
        <Podatak214><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak214>
        <Podatak215><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak215>
        <Podatak300><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak300>
        <Podatak301><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak301>
        <Podatak302><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak302>
        <Podatak303><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak303>
        <Podatak304><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak304>
        <Podatak305><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak305>
        <Podatak306><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak306>
        <Podatak307><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak307>
        <Podatak308><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak308>
        <Podatak309><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak309>
        <Podatak310><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak310>
        <Podatak311><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak311>
        <Podatak312><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak312>
        <Podatak313><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak313>
        <Podatak314><Vrijednost>0.00</Vrijednost><Porez>0.00</Porez></Podatak314>
        <Podatak315>0.00</Podatak315>
        <Podatak400>0.00</Podatak400>
        <Podatak500>0.00</Podatak500>
        <Podatak610>0.00</Podatak610>
        <Podatak611>0.00</Podatak611>
        <Podatak612>0.00</Podatak612>
        <Podatak613>0.00</Podatak613>
        <Podatak614>0.00</Podatak614>
        <Podatak615>0.00</Podatak615>
        <Podatak620>0.00</Podatak620>
        <Podatak630>0.00</Podatak630>
        <Podatak640>0.00</Podatak640>
        <Podatak650>0.00</Podatak650>
        <Podatak660>false</Podatak660>
    </Tijelo>
</ObrazacPDV>
`;

export const PDVS_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<ObrazacPDVS verzijaSheme="1.0" xmlns="http://e-porezna.porezna-uprava.hr/sheme/zahtjevi/ObrazacPDVS/v1-0">
    <Metapodaci xmlns="http://e-porezna.porezna-uprava.hr/sheme/Metapodaci/v2-0">
        <Naslov dc="http://purl.org/dc/elements/1.1/title">Prijava za stjecanje dobara i primljene usluge iz drugih država članica Europske unije</Naslov>
        <Autor dc="http://purl.org/dc/elements/1.1/creator">DENIS ORLIĆ</Autor>
        <Datum dc="http://purl.org/dc/elements/1.1/date">2025-11-16T14:21:52</Datum>
        <Format dc="http://purl.org/dc/elements/1.1/format">text/xml</Format>
        <Jezik dc="http://purl.org/dc/elements/1.1/language">hr-HR</Jezik>
        <Identifikator dc="http://purl.org/dc/elements/1.1/identifier">70aa89ac-9877-4b70-970b-6596758dc935</Identifikator>
        <Uskladjenost dc="http://purl.org/dc/terms/conformsTo">ObrazacPDVS-v1-0</Uskladjenost>
        <Tip dc="http://purl.org/dc/elements/1.1/type">Elektronički obrazac</Tip>
        <Adresant>Ministarstvo Financija, Porezna uprava, Zagreb</Adresant>
    </Metapodaci>
    <Zaglavlje>
        <Razdoblje>
            <DatumOd>2025-10-01</DatumOd>
            <DatumDo>2025-10-31</DatumDo>
        </Razdoblje>
        <Obveznik>
            <Ime>SANDRA</Ime>
            <Prezime>ORLIĆ</Prezime>
            <OIB>63814718221</OIB>
            <Adresa>
                <Mjesto>SPLIT</Mjesto>
                <Ulica>POŽEŠKA</Ulica>
                <Broj>0018</Broj>
            </Adresa>
        </Obveznik>
        <ObracunSastavio>
            <Ime>DENIS</Ime>
            <Prezime>ORLIĆ</Prezime>
            <Email>denis.orlic@gmail.com</Email>
        </ObracunSastavio>
        <Ispostava>3421</Ispostava>
    </Zaglavlje>
    <Tijelo>
        <Isporuke />
        <IsporukeUkupno>
            <I1>0.00</I1>
            <I2>0.00</I2>
        </IsporukeUkupno>
    </Tijelo>
</ObrazacPDVS>
`;