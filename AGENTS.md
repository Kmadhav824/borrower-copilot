# Borrower Copilot — Agent Instructions

## Before working

Read these files first:

* `BORROWER_COPILOT_CONTEXT.md`
* `PROJECT_STATE.md`
* `RULES.md` if it exists
* `README.md` if it exists

Inspect the existing implementation before making changes.

## Product constraints

This is a take-home challenge for Lokta.

The product must help an Indian borrower determine:

1. Whether they should borrow
2. How much a lender may plausibly sanction
3. How much they can safely afford
4. What interest rate is fair
5. What EMI they should accept
6. What they should negotiate with the lender

The product must also generate a Negotiation Card.

## Engineering principles

* Keep financial calculations deterministic.
* Financial rules must not depend on React components.
* Keep the rules easy to inspect and change.
* Add tests for important financial calculations.
* Do not use an LLM as the financial decision-maker.
* Do not treat unknown values as zero.
* Preserve uncertainty and ranges where appropriate.
* Keep lender eligibility separate from borrower-safe affordability.
* Do not invent regulatory requirements.
* Clearly distinguish source-backed rules from judgement and assumptions.

## Scope

Do not add these unless explicitly requested:

* Backend
* Database
* Authentication
* Payments
* Bureau integrations
* Lender integrations
* ML credit scoring
* Microservices
* Docker infrastructure
* Unnecessary APIs

Prefer the simplest implementation that satisfies the assignment.

## UX

The experience should feel like a calm financial advisor rather than a chatbot.

Prefer:

* Adaptive questions
* Clear progress
* Simple explanations
* Ranges instead of false precision
* Confidence indicators
* "Why this number?" explanations
* A useful Negotiation Card

## Financial safety

Never optimize results simply to make the three sample personas look good.

Do not modify a financial rule merely because it produces an undesirable result for a persona.

If an assumption is uncertain, document it.

## Before substantial changes

Briefly identify:

1. What assignment requirement the change addresses
2. What scoring criterion it improves
3. Which files will change
4. Any important assumptions

Avoid unrelated refactoring.

## Verification

After implementation:

* Run the relevant tests.
* Run TypeScript/type checking.
* Check the affected user flow.
* Report any remaining issues honestly.

## Priority

When making decisions, prioritize:

1. Assignment requirements
2. Borrower safety
3. Explainability
4. Correctness
5. Product usability
6. Engineering simplicity
7. Visual polish

Do not expand the scope without a clear reason.
