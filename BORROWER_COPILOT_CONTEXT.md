# Borrower Copilot — Project Context

## 1. Project Mission

Build a borrower-first financial self-assessment tool for Indian borrowers.

The product helps a borrower answer four questions before approaching a lender:

1. Should I borrow at all?
2. How much might a lender sanction?
3. How much can I safely afford?
4. What interest rate and EMI should I negotiate for?

The product must finish with a concise Negotiation Card that the borrower can use when speaking with a lender.

This is NOT a lender underwriting system.
This is NOT a credit bureau.
This is NOT a loan marketplace.
This is NOT an ML credit-scoring model.
This is NOT a generic chatbot.

The product's purpose is borrower empowerment, explainability, and informed negotiation.

---

## 2. Assignment Constraints

The official challenge requires:

* Working web or mobile application
* No login
* No bureau integration
* No personal data storage
* No backend required
* Deterministic calculations are preferred
* Approximately 8–10 minimum questions
* Adaptive additional questions
* Unknown values must never be treated as zero
* Fewer answers must produce wider ranges and lower confidence
* Every important number must have a clear explanation
* Results must distinguish:

  * likely lender sanction
  * safe borrower affordability
* Interest rates must be shown as ranges, not false precision
* APR must account for relevant processing fees
* EMI recommendation must include a stress case
* Application must work well on a phone
* Rules must be separated from UI
* Rules and assumptions must be documented in RULES.md
* Three personas must be tested:

  * Priya
  * Ravi
  * Anita
* A Negotiation Card must be produced for each persona
* README must allow the application to run locally in under 5 minutes

---

## 3. Primary Product Principle

Always optimize for:

BORROWER UNDERSTANDING > FEATURE COUNT

A simpler product with defensible financial reasoning is better than a technically sophisticated product with weak reasoning.

---

## 4. Core Product Outputs

The application must produce exactly these four major outputs:

### O1 — Borrow / Don't Borrow / Borrow Less

A clear recommendation with a concise explanation.

"Don't borrow" is a valid and important outcome.

### O2 — Borrowing Amount

Show TWO separate numbers:

1. Estimated lender-sanction range
2. Estimated safe-borrowing range

Clearly recommend which one the borrower should use.

Never imply that lender eligibility equals financial safety.

### O3 — Fair Interest Rate

Show a range.

Explain the factors affecting the range.

Also calculate/show all-in borrowing cost or APR including relevant fees.

Never present a fabricated exact rate as if it were guaranteed.

### O4 — EMI / Monthly Outflow

Give a recommended maximum monthly payment.

Show tenure trade-offs.

Include at least one stress scenario such as:

* income reduction
* interest-rate increase
* increased household expenses

---

## 5. Negotiation Card

The Negotiation Card is a first-class product output.

It should be usable in front of a lender.

It should contain, at minimum:

* Loan/product type
* Requested amount
* Safe amount
* Likely lender range
* Fair interest-rate range
* Estimated all-in cost/APR
* Recommended maximum EMI
* Suggested tenure
* Stress-case result
* Key reasons supporting the recommendation
* Important negotiation points
* Confidence level
* Important unknowns/assumptions

It should be concise enough to understand at a glance.

---

## 6. Question Design Principles

Start with approximately 8–10 must-answer questions.

Every additional question must have a measurable reason to exist.

Before adding a question, ask:

"What output can this answer change?"

If the answer is "none", do not add the question.

Questions must be adaptive.

Examples:

Salaried borrower:

* employment tenure
* income stability
* existing obligations

Self-employed borrower:

* business tenure
* declared income
* cash-flow stability
* collateral
* business purpose

Informal borrower:

* income stability
* existing high-cost debt
* repayment history
* dependents
* emergency buffer

Do not show irrelevant questions.

---

## 7. Unknown Values

Unknown is NOT zero.

For example:

If credit score is unknown:

DO NOT:

creditScore = 0

Instead:

creditScore = unknown

The system should widen the relevant range and reduce confidence.

Every missing important input should have a visible consequence.

---

## 8. Financial Reasoning

Use deterministic, explainable rules.

Prefer:

input → rule → output → explanation

Avoid opaque calculations.

Every important output should be traceable to borrower inputs.

Example:

"Your recommended EMI is ₹18,000 because your stable monthly income is ₹1,10,000, you already pay ₹14,000 in EMIs, and the model limits additional debt service to the selected affordability threshold."

Do not claim that a threshold is an official RBI requirement unless it actually is.

Clearly label assumptions as:

* Source-backed
* Market-derived
* Product assumption
* My judgement

---

## 9. Lender Eligibility vs Borrower Safety

These must remain separate throughout the application.

Lender eligibility answers:

"What might a lender approve?"

Borrower safety answers:

"What can this person reasonably carry without excessive financial stress?"

The application must never collapse these into one number.

---

## 10. Product Routing

The system should consider the nature of the borrower and purpose of borrowing.

Examples:

* Strong salaried borrower → personal loan may be reasonable depending on affordability
* Self-employed borrower with valuable unencumbered property → consider secured/business lending route
* Borrower with high-cost existing debt and repayment stress → borrowing may need to be discouraged or reduced

Do not automatically recommend an unsecured personal loan to everyone.

---

## 11. Three Required Test Personas

### Priya

Age: 29

Location: Bengaluru

Employment: Software engineer at large MNC

Employment history: 5 years

Net income: ₹1,10,000/month

Existing car EMI: ₹14,000

Remaining car loan: 2 years

Credit score: 780

Rent: ₹28,000/month

Requested loan: ₹8,00,000

Purpose: wedding

---

### Ravi

Age: 42

Location: Mysuru

Business: Kirana store

Business history: 14 years

Cash income: ₹40,000–₹80,000/month

ITR income: ₹4,20,000/year

Property: shop worth approximately ₹45,00,000

Property status: unencumbered

Credit history: none / no known score

Spouse income: ₹18,000/month

Requested amount: ₹15,00,000

Purpose: second stock line + delivery vehicle

The system should consider whether a secured/business product is more appropriate.

---

### Anita

Age: 35

Location: Hubballi

Income: delivery platform + home tailoring

Income: ₹26,000–₹30,000/month

Dependents: two children

Husband: unemployed for 8 months

Existing debt: three app loans

Outstanding: ₹35,000

Existing interest rate: 30%+

Repayment issue: one EMI bounced last month

Requested amount: ₹1,50,000

Purpose: electric scooter

The system must seriously evaluate whether new borrowing is affordable.

---

## 12. Architecture Principle

Separate the application into:

UI
↓
Question/Flow Engine
↓
Profile Normalization
↓
Rules Engine
↓
Calculations
↓
Results
↓
Negotiation Card

Do not embed financial rules directly inside React components.

Rules should be independently testable.

Example conceptual functions:

* calculateLenderEligibility()
* calculateSafeBorrowingAmount()
* calculateFairRateBand()
* calculateAPR()
* calculateSafeEMI()
* calculateStressCase()
* determineBorrowingVerdict()
* determineConfidence()
* generateExplanations()

---

## 13. Technology

Preferred default:

* React
* TypeScript
* Vite
* Modern CSS/Tailwind if useful

Do not introduce unnecessary infrastructure.

No backend unless there is a compelling reason.

No database.

No authentication.

No Docker requirement.

No microservices.

No unnecessary API layer.

---

## 14. AI Usage

AI may assist development.

However:

The actual financial calculations must be deterministic and explainable.

Do not make an LLM responsible for deciding:

* eligibility
* affordability
* interest rate
* EMI
* APR
* risk verdict

If AI is used in the application at all, it must not silently override deterministic financial rules.

---

## 15. Scope Control

Do NOT add features simply because they are technically interesting.

Do not add:

* user accounts
* dashboards
* admin panels
* loan marketplace
* real lender integrations
* credit bureau APIs
* complex authentication
* payment systems
* production databases
* unnecessary backend
* machine-learning credit scoring
* generic AI chat

unless explicitly required later.

---

## 16. UX Principles

The application should feel like a calm financial advisor, not a banking form.

Prefer:

* one question at a time
* clear language
* progressive disclosure
* visible progress
* simple explanations
* ranges instead of fake precision
* mobile-first layout
* clear warnings
* confidence indicators
* easy correction of answers

Avoid:

* financial jargon without explanation
* huge forms
* unnecessary animations
* clutter
* excessive charts
* fake certainty

---

## 17. Decision Quality

When making a product decision, prioritize in this order:

1. Assignment requirements
2. Borrower safety and usefulness
3. Explainability
4. Correct financial reasoning
5. Adaptive questioning
6. Mobile UX
7. Engineering quality
8. Visual polish
9. Additional features

---

## 18. Rules Documentation

Every meaningful rule must eventually appear in RULES.md with:

| What | Value | Why | Source / My judgement |
| ---- | ----- | --- | --------------------- |

If a value is uncertain, say so.

Do not fabricate regulatory requirements.

---

## 19. Definition of Done

The project is complete only when:

* App runs locally using README instructions
* All four outputs work
* Unknown values are handled correctly
* Question flow is adaptive
* Lender eligibility and safe affordability are separate
* Rate is a range
* APR includes relevant fees
* EMI ceiling exists
* Stress scenario exists
* Negotiation Card exists
* Priya run-through works
* Ravi run-through works
* Anita run-through works
* Rules are separated from UI
* RULES.md exists
* README exists
* Major rules have tests
* Important assumptions are disclosed
* No unnecessary infrastructure exists

---

## 20. Codex Working Rule

Before implementing a feature, check this context file.

If a proposed feature does not materially improve one of the required outputs or evaluation criteria, do not implement it without explicit approval.

When uncertain, ask or present the trade-off rather than silently expanding scope.

The goal is not to build the biggest application.

The goal is to build the most defensible Borrower Copilot possible within the challenge time box.
