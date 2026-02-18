export interface Address {
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface Party {
  name: string;
  vatId?: string;
  email?: string;
  phone?: string;
  endpointId: string;
  endpointScheme: string;
  address: Address;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  taxRate: number;
}

export interface TaxSummary {
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface Invoice {
  profileId: string;
  invoiceNumber: string;
  buyerReference: string;
  issueDate: string;
  serviceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  paymentMeansCode: string;
  payeeIban: string;
  payeeBic?: string;
  payeeAccountName?: string;
  currency: 'EUR';
  seller: Party;
  buyer: Party;
  lineItems: LineItem[];
  notes?: string;
}

export interface InvoiceTotals {
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  taxes: TaxSummary[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
