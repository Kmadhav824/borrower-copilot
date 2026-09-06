# Borrower Copilot - Project State

## Snapshot

This repository currently contains the deterministic TypeScript financial-assessment core for Borrower Copilot. It does not yet contain a web UI, question-flow implementation, or local run documentation.

The product goal is a borrower-first assessment for Indian borrowers that distinguishes likely lender sanction from safe borrower affordability and ends with an explainable Negotiation Card.

## Current Implementation

### Domain model

`src/domain/borrower/types.ts` defines the core contracts:

- Explicit `unknown`, known, and range numeric inputs
- Borrower profile, financial, credit, and collateral inputs
- Loan requests and offer/fee inputs
- Eligibility, affordability, APR, stress, tenure, verdict, confidence, and Negotiation Card results

Unknown values are represented explicitly and are not converted to zero.

### Assessment engine

`src/domain/borrower/engine.ts` exposes `assessBorrower()` and currently calculates:

- Estimated lender-sanction range
- Conservative safe-borrowing range
- Safe EMI ceiling
- Fair interest-rate band
- Rate-only or fee-inclusive APR estimate using monthly IRR
- Fixed and floating-rate stress scenarios
- Tenure trade-offs
- Borrow / borrow less / do not borrow / needs information verdict
- Confidence level based on evidence completeness
- Negotiation Card data

The engine keeps lender eligibility and borrower safety as separate outputs. Product routing is handled by `src/products/productCatalog.ts`.

### Calculations and rules

- `src/calculations/loanMath.ts` contains reducing-balance EMI, present-value, monthly IRR, and annualisation calculations.
- `src/calculations/inputs.ts` contains unknown detection and range normalization helpers.
- `src/rules/config.ts` contains configurable caps, income recognition, shocks, collateral LTV, rate bands, tenure options, and confidence penalties.
- Rate bands are ranges and are tagged with source categories such as market observation, assumption, and judgement.
- Financial explanations are structured through `src/explanations/reasons.ts`.

## Verified Behavior

The current test suite covers:

- EMI and present-value inverse calculations
- APR increasing when upfront fees reduce net disbursal
- Invalid cashflows returning no IRR
- A Priya-like strong salaried borrower
- A Ravi-like self-employed borrower routing to a verified secured property route
- An Anita-like borrower with high-cost debt and a recent bounced EMI
- Unknown existing EMI blocking fabricated affordability and sanction estimates
- Unknown mandatory fees producing a rate-only cost view instead of fabricated APR
- Rule configuration changing the safety cap without UI coupling

Latest verification:

```text
npm test
9 tests passed
```

`npm test` runs `tsc -p tsconfig.json` followed by the compiled Node test suite.

## Not Yet Implemented

The following assignment requirements remain open:

- React/Vite web application and mobile-first user experience
- One-question-at-a-time adaptive question flow
- Progress, answer correction, and input explanations in the UI
- UI rendering for all four outputs and the Negotiation Card
- Required persona run-throughs in the application
- `RULES.md` documenting each meaningful rule, rationale, source, and limitation
- `README.md` with setup and run instructions under five minutes
- Browser-level flow verification

The current repository has no backend, database, authentication, integrations, or other unnecessary infrastructure.

## Recommended Next Work

1. Document the configured rules and assumptions in `RULES.md`.
2. Add a minimal React/Vite shell around `assessBorrower()` without moving financial rules into components.
3. Implement the adaptive question flow and profile normalization layer.
4. Render the assessment results and Negotiation Card with clear range, confidence, and uncertainty explanations.
5. Add README setup instructions and browser-level tests for Priya, Ravi, and Anita.

## Guardrails

- Keep financial decisions deterministic and independently testable.
- Never treat unknown values as zero.
- Preserve ranges and lower confidence when evidence is incomplete.
- Keep lender eligibility separate from safe affordability.
- Do not present judgement or market assumptions as regulatory requirements.
- Do not add backend, storage, authentication, bureau, lender, payment, or ML features without explicit scope approval.
