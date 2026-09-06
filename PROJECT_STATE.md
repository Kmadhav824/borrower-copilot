# Borrower Copilot - Project State

## Snapshot

This repository currently contains the deterministic TypeScript financial-assessment core and a React-independent adaptive question-flow/profile-normalization layer for Borrower Copilot. It does not yet contain a web UI or local run documentation.

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

### Question flow and normalization

`src/application/borrowerFlow.ts` defines 10 core questions and adaptive follow-ups. It provides typed question definitions, visibility rules, next-question selection, normalization into `BorrowerProfile` and `LoanRequest`, and conversion into `AssessmentInput`.

Core questions cover income type, purpose, requested amount, income, essential expenses, existing EMIs, upcoming obligations, income stability, credit profile, and loan terms. Adaptive questions cover self-employed co-applicant income, existing high-cost debt and repayment problems, and verified collateral for self-employed business borrowing.

Unknown numeric and boolean answers remain explicit unknown values. Required categorical answers do not get coerced into a domain value; normalization returns a null profile or request until they are resolved.

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
- Salaried, self-employed/business, and informal/debt-risk flow branches
- Irrelevant adaptive questions remaining hidden
- Unknown answers remaining unknown during normalization
- High-cost debt changing the assessed rate profile
- Verified collateral changing product routing and sanction behavior

Latest verification:

```text
npm test
18 tests passed
```

`npm test` runs `tsc -p tsconfig.json` followed by the compiled Node test suite.

## Not Yet Implemented

The following assignment requirements remain open:

- React/Vite web application and mobile-first user experience
- React UI for the adaptive question flow
- Progress, answer correction, and input explanations in the UI
- UI rendering for all four outputs and the Negotiation Card
- Full persona run-throughs through a user-facing application
- `RULES.md` documenting each meaningful rule, rationale, source, and limitation
- `README.md` with setup and run instructions under five minutes
- Browser-level flow verification

The current repository has no backend, database, authentication, integrations, or other unnecessary infrastructure.

## Recommended Next Work

1. Document the configured rules and assumptions in `RULES.md`.
2. Add a minimal React/Vite shell around the question-flow layer and `assessBorrower()` without moving financial rules into components.
3. Render the assessment results and Negotiation Card with clear range, confidence, and uncertainty explanations.
4. Add README setup instructions and browser-level tests for Priya, Ravi, and Anita.

## Guardrails

- Keep financial decisions deterministic and independently testable.
- Never treat unknown values as zero.
- Preserve ranges and lower confidence when evidence is incomplete.
- Keep lender eligibility separate from safe affordability.
- Do not present judgement or market assumptions as regulatory requirements.
- Do not add backend, storage, authentication, bureau, lender, payment, or ML features without explicit scope approval.


## Handoff Instructions

This project was previously developed with another coding agent.

Treat the actual source code as the source of truth for implementation status.

Before making changes:

1. Read AGENTS.md
2. Read BORROWER_COPILOT_CONTEXT.md
3. Read PROJECT_STATE.md
4. Read RULES.md if it exists
5. Inspect the current source code
6. Run the existing tests

Do not rewrite working financial logic without a specific reason.

Do not change rules merely to produce more attractive results for Priya, Ravi, or Anita.

Preserve the distinction between:
- likely lender sanction
- borrower-safe borrowing
- fair rate
- EMI ceiling

Any new financial rule must be documented and tested.
Any new financial rule must be documented and tested.
Any new financial rule must be documented and tested.