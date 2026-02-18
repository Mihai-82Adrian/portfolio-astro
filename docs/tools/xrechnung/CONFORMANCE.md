# XRechnung Conformance

## Validation Engine
- KoSIT Validator engine (version pinned in `tools/kosit/versions.json`)
- Official XRechnung validator configuration (version pinned in `tools/kosit/versions.json`)

The runtime metadata is written to:
- `tools/kosit/runtime/metadata.json`

## Reproducible Commands
- `npm run kosit:setup`
- `npm run verify:xrechnung:fixtures`
- `npm run verify:xrechnung:kosit`

`verify:xrechnung:kosit` does all of the following:
1. Assembles KoSIT runtime from pinned archives.
2. Generates 10 canonical fixture invoices.
3. Exports both syntaxes per fixture (`UBL` + `CII` => 20 files).
4. Validates all generated files with KoSIT.
5. Validates curated testsuite sample files from `tests/xrechnung/kosit-testsuite-samples/`.

Any validation failure exits non-zero.

## Supported v1 Scope
- Canonical invoice model shared by both syntaxes.
- Syntax export toggle:
  - UBL 2.1 (`Invoice`)
  - UN/CEFACT CII (`CrossIndustryInvoice`)
- Seller + buyer identity and postal address.
- Invoice ID, issue date, optional due date.
- Line items with quantity, unit price, tax rate, and totals.
- VAT breakdown (0/7/19 and mixed lines).
- XML download only.

## Explicitly Out of Scope (v1)
- Reverse charge handling.
- Allowances/charges on header or line level.
- Attachments/binary objects.
- Routing IDs / Leitweg-ID specific logic.
- Advanced payment means mapping.
- Country-specific extensions beyond baseline EN 16931/XRechnung profile.

## Runtime Security and Privacy
- Generator is local-first.
- No server-side storage.
- No runtime network calls for generation/export.
- Optional localStorage is opt-in and stores sender defaults only.
