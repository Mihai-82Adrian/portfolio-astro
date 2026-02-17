import { isIsoDate } from './date';
import type { Invoice, ValidationResult } from './types';

function required(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function validateInvoice(invoice: Invoice): ValidationResult {
  const errors: Record<string, string> = {};

  if (!required(invoice.invoiceNumber)) {
    errors.invoiceNumber = 'Rechnungsnummer ist erforderlich.';
  }

  if (!required(invoice.issueDate) || !isIsoDate(invoice.issueDate)) {
    errors.issueDate = 'Gültiges Rechnungsdatum ist erforderlich (YYYY-MM-DD).';
  }

  if (invoice.dueDate && !isIsoDate(invoice.dueDate)) {
    errors.dueDate = 'Fälligkeitsdatum muss YYYY-MM-DD sein.';
  }

  if (!required(invoice.seller.name)) {
    errors['seller.name'] = 'Name des Senders ist erforderlich.';
  }
  if (!required(invoice.seller.address.street)) {
    errors['seller.street'] = 'Straße des Senders ist erforderlich.';
  }
  if (!required(invoice.seller.address.city)) {
    errors['seller.city'] = 'Ort des Senders ist erforderlich.';
  }
  if (!required(invoice.seller.address.postalCode)) {
    errors['seller.postalCode'] = 'PLZ des Senders ist erforderlich.';
  }
  if (!required(invoice.seller.address.countryCode)) {
    errors['seller.countryCode'] = 'Land des Senders ist erforderlich.';
  }

  if (!required(invoice.buyer.name)) {
    errors['buyer.name'] = 'Name des Käufers ist erforderlich.';
  }
  if (!required(invoice.buyer.address.street)) {
    errors['buyer.street'] = 'Straße des Käufers ist erforderlich.';
  }
  if (!required(invoice.buyer.address.city)) {
    errors['buyer.city'] = 'Ort des Käufers ist erforderlich.';
  }
  if (!required(invoice.buyer.address.postalCode)) {
    errors['buyer.postalCode'] = 'PLZ des Käufers ist erforderlich.';
  }
  if (!required(invoice.buyer.address.countryCode)) {
    errors['buyer.countryCode'] = 'Land des Käufers ist erforderlich.';
  }

  if (invoice.lineItems.length === 0) {
    errors.lineItems = 'Mindestens eine Position ist erforderlich.';
  }

  invoice.lineItems.forEach((item, index) => {
    if (!required(item.description)) {
      errors[`lineItems.${index}.description`] = 'Beschreibung ist erforderlich.';
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors[`lineItems.${index}.quantity`] = 'Menge muss > 0 sein.';
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors[`lineItems.${index}.unitPrice`] = 'Preis muss >= 0 sein.';
    }
    if (!Number.isFinite(item.taxRate) || item.taxRate < 0) {
      errors[`lineItems.${index}.taxRate`] = 'Steuersatz muss >= 0 sein.';
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
