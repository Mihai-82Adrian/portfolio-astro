
/**
 * German Invoice Validation Module
 * Implements XRechnung/ZUGFeRD validation rules and accounting checks
 * Compliant with: HGB, UStG, GoBD
 */

interface GermanInvoice {
  invoiceNumber: string;
  issueDate: Date;
  supplierName: string;
  supplierVatId: string; // USt-IdNr. format: DE123456789
  customerName: string;
  customerVatId?: string;
  netAmount: number;
  taxRate: number; // 19%, 7%, or 0% (Germany)
  taxAmount: number;
  grossAmount: number;
  currency: string; // EUR
  paymentTerms: string;
  lineItems: InvoiceLineItem[];
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  grossAmount: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class GermanInvoiceValidator {
  private readonly VALID_TAX_RATES = [0, 7, 19]; // Standard German VAT rates
  private readonly VAT_ID_REGEX = /^DE[0-9]{9}$/;
  private readonly TOLERANCE = 0.01; // €0.01 rounding tolerance

  /**
   * Comprehensive validation of a German invoice
   */
  validate(invoice: GermanInvoice): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Mandatory field validation (§14 UStG)
    this.validateMandatoryFields(invoice, errors);

    // 2. VAT ID format validation
    this.validateVatId(invoice.supplierVatId, 'Supplier', errors);
    if (invoice.customerVatId) {
      this.validateVatId(invoice.customerVatId, 'Customer', warnings);
    }

    // 3. Tax rate validation
    this.validateTaxRate(invoice.taxRate, errors);

    // 4. Arithmetic validation (net + tax = gross)
    this.validateArithmetic(invoice, errors);

    // 5. Line items validation
    this.validateLineItems(invoice, errors);

    // 6. Date validation (GoBD: future dates not allowed for booking)
    this.validateDate(invoice.issueDate, errors, warnings);

    // 7. Currency validation
    if (invoice.currency !== 'EUR') {
      warnings.push(`Non-EUR currency detected: ${invoice.currency}. Ensure proper FX conversion.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateMandatoryFields(invoice: GermanInvoice, errors: string[]): void {
    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
      errors.push('Invoice number is mandatory (§14 UStG).');
    }
    if (!invoice.issueDate) {
      errors.push('Issue date is mandatory (§14 UStG).');
    }
    if (!invoice.supplierName || invoice.supplierName.trim() === '') {
      errors.push('Supplier name is mandatory (§14 UStG).');
    }
    if (!invoice.supplierVatId || invoice.supplierVatId.trim() === '') {
      errors.push('Supplier VAT ID is mandatory (§14 UStG).');
    }
  }

  private validateVatId(vatId: string, party: string, errors: string[]): void {
    if (!this.VAT_ID_REGEX.test(vatId)) {
      errors.push(
        `${party} VAT ID "${vatId}" is invalid. ` +
        `Format must be DE followed by 9 digits (e.g., DE123456789).`
      );
    }
  }

  private validateTaxRate(taxRate: number, errors: string[]): void {
    if (!this.VALID_TAX_RATES.includes(taxRate)) {
      errors.push(
        `Invalid tax rate: ${taxRate}%. Valid rates in Germany: 0%, 7%, 19%.`
      );
    }
  }

  private validateArithmetic(invoice: GermanInvoice, errors: string[]): void {
    // Rule 1: taxAmount = netAmount * taxRate / 100
    const expectedTax = invoice.netAmount * (invoice.taxRate / 100);
    if (Math.abs(invoice.taxAmount - expectedTax) > this.TOLERANCE) {
      errors.push(
        `Tax calculation error: Expected ${expectedTax.toFixed(2)}, ` +
        `got ${invoice.taxAmount.toFixed(2)} (net: ${invoice.netAmount}, rate: ${invoice.taxRate}%).`
      );
    }

    // Rule 2: grossAmount = netAmount + taxAmount
    const expectedGross = invoice.netAmount + invoice.taxAmount;
    if (Math.abs(invoice.grossAmount - expectedGross) > this.TOLERANCE) {
      errors.push(
        `Gross amount mismatch: Expected ${expectedGross.toFixed(2)}, ` +
        `got ${invoice.grossAmount.toFixed(2)} (net: ${invoice.netAmount}, tax: ${invoice.taxAmount}).`
      );
    }
  }

  private validateLineItems(invoice: GermanInvoice, errors: string[]): void {
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      errors.push('Invoice must contain at least one line item.');
      return;
    }

    let totalNet = 0;
    let totalTax = 0;
    let totalGross = 0;

    invoice.lineItems.forEach((item, index) => {
      // Validate line item arithmetic
      const expectedNet = item.quantity * item.unitPrice;
      if (Math.abs(item.netAmount - expectedNet) > this.TOLERANCE) {
        errors.push(
          `Line ${index + 1}: Net amount error. ` +
          `Expected ${expectedNet.toFixed(2)}, got ${item.netAmount.toFixed(2)}.`
        );
      }

      const expectedTax = item.netAmount * (item.taxRate / 100);
      if (Math.abs(item.taxAmount - expectedTax) > this.TOLERANCE) {
        errors.push(
          `Line ${index + 1}: Tax amount error. ` +
          `Expected ${expectedTax.toFixed(2)}, got ${item.taxAmount.toFixed(2)}.`
        );
      }

      const expectedGross = item.netAmount + item.taxAmount;
      if (Math.abs(item.grossAmount - expectedGross) > this.TOLERANCE) {
        errors.push(
          `Line ${index + 1}: Gross amount error. ` +
          `Expected ${expectedGross.toFixed(2)}, got ${item.grossAmount.toFixed(2)}.`
        );
      }

      totalNet += item.netAmount;
      totalTax += item.taxAmount;
      totalGross += item.grossAmount;
    });

    // Validate that line items sum to invoice totals
    if (Math.abs(totalNet - invoice.netAmount) > this.TOLERANCE) {
      errors.push(
        `Sum of line items net (${totalNet.toFixed(2)}) ` +
        `does not match invoice net (${invoice.netAmount.toFixed(2)}).`
      );
    }

    if (Math.abs(totalTax - invoice.taxAmount) > this.TOLERANCE) {
      errors.push(
        `Sum of line items tax (${totalTax.toFixed(2)}) ` +
        `does not match invoice tax (${invoice.taxAmount.toFixed(2)}).`
      );
    }

    if (Math.abs(totalGross - invoice.grossAmount) > this.TOLERANCE) {
      errors.push(
        `Sum of line items gross (${totalGross.toFixed(2)}) ` +
        `does not match invoice gross (${invoice.grossAmount.toFixed(2)}).`
      );
    }
  }

  private validateDate(issueDate: Date, errors: string[], warnings: string[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (issueDate > today) {
      warnings.push(
        `Invoice date ${issueDate.toISOString().split('T')[0]} is in the future. ` +
        `GoBD compliance: booking with future dates requires justification.`
      );
    }

    // Check if date is too old (e.g., > 10 years for retention period)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (issueDate < tenYearsAgo) {
      warnings.push(
        `Invoice date ${issueDate.toISOString().split('T')[0]} is older than 10 years. ` +
        `Verify retention obligations (GoBD: minimum 10 years).`
      );
    }
  }
}

// Example usage
const validator = new GermanInvoiceValidator();

const sampleInvoice: GermanInvoice = {
  invoiceNumber: 'RE-2024-001',
  issueDate: new Date('2024-11-01'),
  supplierName: 'Musterfirma GmbH',
  supplierVatId: 'DE123456789',
  customerName: 'Beispiel AG',
  customerVatId: 'DE987654321',
  netAmount: 1000.0,
  taxRate: 19,
  taxAmount: 190.0,
  grossAmount: 1190.0,
  currency: 'EUR',
  paymentTerms: 'Net 30',
  lineItems: [
    {
      description: 'Consulting services',
      quantity: 10,
      unitPrice: 100.0,
      netAmount: 1000.0,
      taxRate: 19,
      taxAmount: 190.0,
      grossAmount: 1190.0
    }
  ]
};

const result = validator.validate(sampleInvoice);

if (result.isValid) {
  console.log('✓ Invoice is valid.');
} else {
  console.log('✗ Invoice validation failed.');
  result.errors.forEach(err => console.error(`  ERROR: ${err}`));
}

if (result.warnings.length > 0) {
  console.log('⚠ Warnings:');
  result.warnings.forEach(warn => console.warn(`  WARNING: ${warn}`));
}

export { GermanInvoiceValidator, GermanInvoice, ValidationResult };
