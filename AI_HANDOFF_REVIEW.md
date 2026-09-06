# Borrower Copilot - AI Handoff Review

Date: 2026-09-06

## Scope

This is a reconstruction of the repository as it exists now. The source code is treated as the implementation source of truth. No existing project files were changed for this review.

## Product Purpose

Borrower Copilot is intended to be a borrower-first financial self-assessment tool for Indian borrowers. It should help a borrower decide:

- Whether to borrow, borrow less, or avoid borrowing
- How much a lender might plausibly sanction
- How much the borrower can safely afford
- What interest-rate range and EMI to negotiate
- What terms and questions to take to a lender

The final product must generate a concise, explainable Negotiation Card. It is explicitly not a lender underwriting system, credit bureau, loan marketplace, ML credit score, or generic chatbot.

The assignment brief requires a working web or mobile application with no login, no personal-data storage, no bureau integration, and no backend requirement. Financial decisions must remain deterministic and explainable.

## Current Git State

Working tree at review time:

```text
 M PROJECT_STATE.md
```

The modified file is an existing user or automated edit and was not changed during this review.

Recent commits:

```text
e3fd97d (HEAD -> main) WIP: borrower copilot progress
2c01f3a (origin/main) chore: establish borrower copilot context, initial commit
```

The current `HEAD` is ahead of `origin/main` by the WIP commit. The repository contains tracked generated `dist/` output from TypeScript compilation.

## Implemented

### Domain model

`src/domain/borrower/types.ts` defines:

- Explicit `unknown`, known, and numeric-range inputs
- Borrower, financial, credit, and collateral profiles
- Loan request and lender-offer inputs
- Monetary and percentage ranges
- Eligibility, affordability, APR, stress, tenure, verdict, confidence, explanation, and Negotiation Card result types

Unknown numeric values are represented explicitly rather than as zero at the type level.

### Assessment engine

`src/domain/borrower/engine.ts` exposes `assessBorrower()` and currently computes:

- Estimated lender-sanction range and lender EMI capacity
- Conservative safe-borrowing range
- Safe EMI range and recommended maximum EMI
- Fair interest-rate band
- Fee-inclusive APR when enough offer information is present
- Rate-only repayment cost when mandatory fee information is unavailable
- Fixed- and floating-rate stress scenarios
- Product tenure trade-offs
- Borrow, borrow less, do not borrow, and needs-information verdicts
- Confidence level based on selected evidence gaps
- Negotiation Card data

The implementation keeps likely lender eligibility separate from borrower-safe affordability.

### Supporting modules

- `src/calculations/loanMath.ts`: reducing-balance EMI, present value, monthly IRR by bisection, and annualisation
- `src/calculations/inputs.ts`: unknown detection, numeric normalization, and range creation
- `src/products/productCatalog.ts`: product routing
- `src/rules/config.ts`: configurable financial rules and source classifications
- `src/explanations/reasons.ts`: structured explanation metadata

Product routing currently selects:

- Two-wheeler lending for vehicle purposes when product intent is unsure
- Loan-against-property when the purpose is business and property ownership and encumbrance are verified
- Business lending for other business cases
- Personal lending for remaining cases

## Partially Implemented

- The financial engine is implemented, but there is no application UI around it.
- The Negotiation Card data exists, but it does not explicitly model negotiation points or a structured list of important unknowns and assumptions required by the assignment.
- The engine emits structured explanations, but no user-facing "why this number?" presentation exists.
- Required persona behavior is represented by unit fixtures, not complete application journeys.
- Product routing exists, but there is no question-flow engine or profile-normalization layer.
- Stress testing exists in code, but there is no user-facing stress explanation or interaction.
- Rule definitions contain rationale and limitations in code, but the required human-readable rules document is absent.

## Not Implemented

The repository currently has no:

- React or Vite application
- Browser entry point, HTML shell, stylesheet, or dev-server script
- One-question-at-a-time question flow
- Adaptive questions or branching based on borrower type and purpose
- Progress indicator or answer-correction flow
- Mobile UI
- Rendered result screens
- Rendered Negotiation Card
- Browser or end-to-end tests
- `README.md`
- Populated `RULES.md`

There is no backend, database, authentication, API, lender integration, bureau integration, payment system, ML scoring, or LLM decision-maker, which is consistent with the explicit scope constraints.

## Current Architecture

### Implemented architecture

```text
BorrowerProfile + LoanRequest + optional LoanOfferInputs
        |
        v
Product routing
        |
        v
Configurable rules
        |
        v
Loan calculations
        |
        v
assessBorrower()
        |
        v
AssessmentResult + NegotiationCardData
```

### Intended architecture from the assignment

```text
UI
  -> Question / Flow Engine
  -> Profile Normalization
  -> Rules Engine
  -> Calculations
  -> Results
  -> Negotiation Card
```

Only the rules, calculations, routing, result contracts, and assessment engine portions currently exist. Financial logic is not in React components because there are no React components yet.

## Current Financial Rules

Configured in `src/rules/config.ts`:

| Rule | Current value | Classification |
| --- | --- | --- |
| Safe debt-service cap | Salaried 40%, self-employed 35%, informal 30% | Our judgement |
| Estimated lender debt-service cap | Salaried 50-55%, self-employed 45-55%, informal 35-45% | Assumption |
| Retained monthly buffer | Salaried 10%, self-employed 15%, informal 20% | Our judgement |
| Income recognition | Salaried 95-100%, self-employed 75-95%, informal 60-80% | Our judgement |
| Income stress shock | Salaried 10%, self-employed 20%, informal 25% | Our judgement |
| Essential-expense stress shock | 10% | Our judgement |
| Floating-rate stress shock | 2 percentage points | Our judgement; numeric value is not claimed as an RBI mandate |
| Minimum post-stress surplus | Max of INR 5,000 or 5% of stressed income | Our judgement |
| Secured-route LTV reference | 45-60% | Our judgement; actual LTV depends on lender valuation and verification |
| Market rate envelopes | Product-specific bands for personal, business, property-backed, gold, and two-wheeler loans | Market observation |
| Profile rate bands | Strong, standard, limited, and stressed bands per product | Our judgement |
| Tenure options | Product-specific fixed comparison options | Assumption |
| Confidence penalties | Penalties for missing income, expenses, EMI, credit, fees, collateral verification, and stable income | Our judgement |

The code says the market rate envelopes were researched from official lender disclosures in September 2026, but the repository contains no source URLs or citations. `RULES.md` is empty, so the required rule/rationale/source/limitation documentation has not been completed.

## Current Question Flow

No question flow is implemented.

The domain model can accept the necessary values, but there is no sequencing, branching, validation, unknown-value choice, progress tracking, or answer correction. The assignment calls for approximately 8-10 must-answer questions plus adaptive questions. The current repository has none of these user-facing or flow-engine behaviors.

A future flow should preserve the assignment's routing intent:

- Salaried borrowers: employment tenure, income stability, and existing obligations
- Self-employed borrowers: business tenure, documented income, cash-flow stability, collateral, and business purpose
- Informal borrowers: income stability, high-cost debt, repayment history, dependants, and emergency buffer

Each additional question should have a clear output it can change.

## Current UI Flow

No UI exists. There is no way for a borrower to enter data, see progress, inspect explanations, view the four required outputs, or use the Negotiation Card.

## Existing Tests

The test suite has two files and nine tests:

### `tests/loanMath.test.ts`

- EMI and present-value calculations are inverse operations
- Upfront fees increase APR above the nominal rate
- Invalid cashflows return no IRR

### `tests/engine.test.ts`

- Priya-like strong salaried borrower has a safe amount below likely sanction
- Ravi-like self-employed borrower routes to loan-against-property when collateral is verified
- Anita-like borrower with recent repayment trouble and high-cost debt receives do-not-borrow
- Unknown existing EMI is not treated as zero
- Unknown mandatory fees produce a rate-only cost view rather than fabricated APR
- Safety rules can be configured independently of UI logic

The current command is:

```text
npm test
```

It runs `npm run build` and then the compiled Node test suite. The latest run passed all 9 tests and TypeScript compilation.

## Known Bugs and Risks

### 1. Unknown upcoming obligations are treated as zero

In `src/domain/borrower/engine.ts`, an unknown `upcomingMonthlyObligations` value is converted to `range(0, 0)`:

```ts
const upcomingRange = upcoming ?? range(0, 0);
```

This conflicts directly with the project rule that unknown values must never be treated as zero. It can overstate safe EMI and safe borrowing. This is the highest-confidence correctness issue found.

### 2. Some captured inputs do not affect the calculation

`dependants`, `emergencySavingsMonths`, and `employmentOrBusinessTenureMonths` are present in the profile model but are not meaningfully used by the assessment calculations. `documentedMonthlyIncome` affects rate quality but not stable-income affordability recognition. This creates a risk that a future UI asks questions whose answers do not change an output.

### 3. APR fallback is implicit when offered rate is unknown

When an offer exists but `nominalAnnualRate` is unknown, APR calculation falls back to the fair-rate band and can still return `estimated`. The fallback is not represented as a dedicated explanation or status, so a consumer could mistake a model estimate for an offer-based APR.

### 4. Confidence does not cover every APR information gap

Unknown processing fees reduce confidence, but unknown third-party charges and applicable taxes can make APR unavailable or rate-only without equivalent confidence penalties.

### 5. Inconsistent credit inputs are accepted

A profile can declare `scoreStatus: "known"` while supplying an unknown score. `profileQuality()` then falls through to a standard profile instead of clearly marking the evidence limited.

### 6. Range validity is not validated

`NumericInput` permits negative values and reversed ranges. `range()` normalizes ordering but does not reject invalid financial values. The loan math functions reject some negative inputs, but profile and request inputs are not comprehensively validated before assessment.

### 7. Secured-route cap is applied with a potentially misleading range construction

The collateral cap is combined with repayment capacity using `Math.min` independently on the low and high bounds. This may produce a range that is numerically ordered but does not clearly communicate whether both endpoints represent consistent capacity and collateral scenarios. It needs a focused test before being exposed in a user-facing result.

### 8. Generated build output is tracked

`dist/` is tracked in git. This is not a financial correctness bug, but it creates generated-source drift and adds noise to commits. It should only be changed or untracked deliberately, not as part of unrelated work.

## Contradictions and Documentation Gaps

- The assignment requires a working web or mobile application, but the repository is currently only a TypeScript engine and test suite.
- The assignment requires `README.md` run instructions, but `README.md` does not exist.
- The assignment requires rules documented in `RULES.md`, but `RULES.md` is empty.
- The assignment requires Negotiation Card negotiation points and important unknowns/assumptions, but `NegotiationCardData` only contains key reasons and confidence; it has no explicit fields for those two items.
- The project context says fewer answers should produce wider ranges and lower confidence, but there is no question flow and the current confidence logic does not account for every unknown field.
- The project context says unknown values must never be treated as zero, but upcoming obligations currently are.
- The context asks for every important number to have a clear explanation, but explanations are currently metadata only and are not rendered anywhere.
- The context calls for three personas to be tested. The current tests are representative unit fixtures, not full persona run-throughs through a working app.
- The current edited `PROJECT_STATE.md` repeats the instruction that new financial rules must be documented and tested three times. This is harmless documentation duplication, not an implementation issue.

## Recommended Next Steps

1. **Fix and test unknown upcoming obligations before building UI.**
   Decide whether unknown upcoming obligations should block safe-borrowing calculation or produce a widened range. The choice should preserve uncertainty, never substitute zero, and be covered by a regression test.

2. **Populate `RULES.md`.**
   Document every configured rule using the required columns: what, value, why, and source or judgement. Add source links for market-rate observations or explicitly mark them as unverified assumptions.

3. **Add a minimal profile-normalization and adaptive-flow layer.**
   Keep UI state separate from the domain model. Map answers to explicit known, range, or unknown values. Make each question's effect on an output inspectable.

4. **Build the smallest mobile-first React/Vite shell.**
   Wire it to `assessBorrower()` without moving calculations into components. Implement progress, correction, clear unknown options, explanations, and the four required output sections.

5. **Complete Negotiation Card data and presentation.**
   Add explicit negotiation points and important assumptions/unknowns to the result contract or derive them from structured explanations. Render lender range and safe range as separate concepts.

6. **Add integration/browser coverage for Priya, Ravi, and Anita.**
   Verify full question journeys, product routing, verdicts, rate ranges, stress outcomes, and Negotiation Cards rather than only calling the engine with fixtures.

7. **Add `README.md` and make the run path reproducible.**
   Include installation, build, test, and dev-server instructions that satisfy the under-five-minute requirement.

## Single Highest-Priority Next Task

Correct the unknown `upcomingMonthlyObligations` handling and add a regression test before introducing the UI. This is a direct violation of the financial-safety guardrails and can overstate affordability. Once corrected, the next product priority is the minimal adaptive mobile UI because no usable application currently exists.

## Files Inspected

### Repository instructions and state

- `AGENTS.md`
- `BORROWER_COPILOT_CONTEXT.md`
- `PROJECT_STATE.md`
- `RULES.md`
- `README.md` was requested for inspection but does not exist
- `package.json`
- `tsconfig.json`

### Source

- `src/domain/borrower/types.ts`
- `src/domain/borrower/engine.ts`
- `src/rules/config.ts`
- `src/calculations/loanMath.ts`
- `src/calculations/inputs.ts`
- `src/products/productCatalog.ts`
- `src/explanations/reasons.ts`

### Tests

- `tests/engine.test.ts`
- `tests/loanMath.test.ts`

### Repository metadata inspected

- Git working-tree status
- Recent git log
- Tracked-file inventory

## Review Boundary

No existing source, test, rules, state, or configuration file was modified. The only file created by this request is `AI_HANDOFF_REVIEW.md`.
