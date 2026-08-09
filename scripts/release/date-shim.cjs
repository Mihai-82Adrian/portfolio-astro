// Test-only Node preload shim used by the cross-date reproducibility guard
// (tests/release-cross-date-reproducibility.test.mjs). Freezes zero-arg
// `new Date()` / `Date.now()` to PORTFOLIO_FIXED_NOW via a Proxy around the
// real Date constructor, preserving `instanceof Date` identity so
// astro:content's Zod date parsing (and anything else checking `instanceof
// Date`) keeps working. Loaded only via `node --require` for a throwaway
// build; never imported by application source.
'use strict';

const FIXED = process.env.PORTFOLIO_FIXED_NOW;
if (FIXED) {
  const RealDate = Date;
  const fixedMs = new RealDate(FIXED).getTime();
  if (Number.isNaN(fixedMs)) {
    throw new Error(`date-shim: invalid PORTFOLIO_FIXED_NOW=${FIXED}`);
  }
  const handler = {
    construct(target, args) {
      return args.length === 0 ? new target(fixedMs) : new target(...args);
    },
    apply(target, _thisArg, args) {
      return args.length === 0 ? new target(fixedMs).toString() : target(...args);
    },
    get(target, prop, receiver) {
      if (prop === 'now') return () => fixedMs;
      return Reflect.get(target, prop, receiver);
    },
  };
  globalThis.Date = new Proxy(RealDate, handler);
}
