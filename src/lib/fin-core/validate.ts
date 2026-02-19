import { isIsoDate } from './date';
import type { Invoice, ValidationResult } from './types';
import { profileModeFromCustomizationId, type InvoiceProfileMode } from './xrechnung';

function required(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function isLikelyIban(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.replaceAll(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{13,32}$/.test(normalized);
}

function hasAtLeastThreeDigits(value: string | undefined): boolean {
  if (!value) return false;
  const digits = value.replaceAll(/\D+/g, '');
  return digits.length >= 3;
}

function isLikelyBuyerReference(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim();
  // Basic, permissive pattern for Leitweg-ID / customer PO reference.
  return /^[A-Za-z0-9][A-Za-z0-9\-\/:.]{2,79}$/.test(normalized);
}

interface ValidateOptions {
  profileMode?: InvoiceProfileMode;
}

export function validateInvoice(invoice: Invoice, options?: ValidateOptions): ValidationResult {
  const errors: Record<string, string> = {};
  const profileMode = options?.profileMode ?? profileModeFromCustomizationId(invoice.profileId);
  const needsEndpointValidation = profileMode !== 'en16931';

  if (!required(invoice.invoiceNumber)) {
    errors.invoiceNumber = 'Rechnungsnummer ist erforderlich.';
  }
  if (profileMode === 'xrechnung' && !required(invoice.buyerReference)) {
    errors.buyerReference = 'Buyer Reference (BT-10) ist für XRechnung erforderlich.';
  }
  if (required(invoice.buyerReference) && !isLikelyBuyerReference(invoice.buyerReference)) {
    errors.buyerReference =
      'Buyer Reference enthält ungültige Zeichen. Erlaubt: A-Z, 0-9, -, /, :, .';
  }

  if (!required(invoice.issueDate) || !isIsoDate(invoice.issueDate)) {
    errors.issueDate = 'Gültiges Rechnungsdatum ist erforderlich (YYYY-MM-DD).';
  }
  if (!required(invoice.serviceDate) || !isIsoDate(invoice.serviceDate)) {
    errors.serviceDate = 'Leistungsdatum ist erforderlich (YYYY-MM-DD).';
  }

  if (invoice.dueDate && !isIsoDate(invoice.dueDate)) {
    errors.dueDate = 'Fälligkeitsdatum muss YYYY-MM-DD sein.';
  }
  if (invoice.issueDate && invoice.dueDate && isIsoDate(invoice.issueDate) && isIsoDate(invoice.dueDate)) {
    if (invoice.dueDate <= invoice.issueDate) {
      errors.dueDate = 'Fälligkeitsdatum muss nach dem Rechnungsdatum liegen (BR-CO-25).';
    }
  }
  if (!required(invoice.dueDate) && !required(invoice.paymentTerms)) {
    errors.paymentTerms =
      'Bitte Fälligkeitsdatum oder Zahlungsbedingungen angeben (EN16931 BR-CO-25).';
  }
  if (!required(invoice.paymentMeansCode)) {
    errors.paymentMeansCode = 'Zahlungsmittelcode ist erforderlich (BG-16).';
  }
  if (!isLikelyIban(invoice.payeeIban)) {
    errors.payeeIban = 'Gültige IBAN ist erforderlich (BG-16).';
  }

  if (!required(invoice.seller.name)) {
    errors['seller.name'] = 'Name des Senders ist erforderlich.';
  }
  if (!required(invoice.seller.email)) {
    errors['seller.email'] = 'E-Mail des Senders ist erforderlich (BG-6 Seller Contact).';
  }
  if (!hasAtLeastThreeDigits(invoice.seller.phone)) {
    errors['seller.phone'] = 'Telefonnummer des Senders ist erforderlich (mind. 3 Ziffern, BR-DE-27).';
  }
  if (needsEndpointValidation) {
    if (!required(invoice.seller.endpointId)) {
      errors['seller.endpointId'] = 'Elektronische Adresse (EndpointID) des Senders ist erforderlich.';
    }
    if (!required(invoice.seller.endpointScheme)) {
      errors['seller.endpointScheme'] =
        'Endpoint-Schema des Senders ist erforderlich (z.B. EM, 0204, 0088).';
    }
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
  if (needsEndpointValidation) {
    if (!required(invoice.buyer.endpointId)) {
      errors['buyer.endpointId'] = 'Elektronische Adresse (EndpointID) des Käufers ist erforderlich.';
    }
    if (!required(invoice.buyer.endpointScheme)) {
      errors['buyer.endpointScheme'] =
        'Endpoint-Schema des Käufers ist erforderlich (z.B. EM, 0204, 0088).';
    }
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
