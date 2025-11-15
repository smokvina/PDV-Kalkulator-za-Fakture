export interface DebugInfo {
  processingTimeMs: number;
  modelUsed: string;
  rawError: string;
}

export interface InvoiceData {
  meta: {
    parsed_at: string;
    source_file: string;
    parser_version: string;
    audit_hash: string;
  };
  supplier: {
    name: string;
    address: string;
    vat_id: string;
    is_eu_vat_valid: boolean;
  };
  buyer: {
    name:string;
    address: string;
    vat_id: string;
  };
  invoice: {
    invoice_number: string;
    invoice_date: string;
    service_period_from: string;
    service_period_to: string;
    currency: string;
  };
  line_items: Array<{
    description: string;
    amount: number;
  }>;
  calculations: {
    commission_base: number;
    vat_rate_percent: number;
    vat_amount: number;
    commission_total_with_vat: number;
    notes: string;
  };
  actions: {
    reverse_charge_applies: boolean;
    instructions_for_pdv_form: string;
    manual_review_required: boolean;
  };
  errors: string[];
}

export interface ProcessedFile {
  id: string;
  file: File;
  data: InvoiceData | null;
  status: 'queue' | 'loading' | 'success' | 'error';
  error: string | null;
  debugInfo?: DebugInfo | null;
}