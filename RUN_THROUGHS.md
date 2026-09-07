# Borrower Copilot Run-Throughs

Captured from the current question flow (`src/application/borrowerFlow.ts`) and `assessBorrower()` with no engine changes. Amounts are modelled estimates, not lender approvals. Currency and rates follow the app format (`en-IN`). Where the persona brief does not supply a required flow input, the completion assumption is stated.

The flow does not collect age, city, employer/business tenure, documented income, ITR, dependants, or emergency savings. Those remain unknown and are not treated as zero.

## Priya

**Persona:** 29, Bengaluru; salaried software engineer at a large MNC, 5 years; ₹1,10,000 net/month; ₹14,000 car EMI with 2 years remaining; credit score 780; ₹28,000 rent; wants ₹8,00,000 personal loan for a wedding.

### Questions asked

| App question | Answer used |
| --- | --- |
| How do you earn most of your income? | Salaried |
| What is the loan for? | Wedding |
| How much do you want to borrow? | ₹8,00,000 |
| What is your usual monthly income? | ₹1,10,000 |
| How much do essential household expenses cost each month? | ₹35,000. Completion assumption: the brief gives rent ₹28,000, not total essentials. |
| How much do you currently pay toward loans each month? | ₹14,000 |
| Do you have other known monthly commitments starting soon? | ₹0. Completion assumption: none specified. |
| How stable is that income month to month? | Mostly stable |
| Which best describes your credit history? | I know my score → 780 |
| What repayment term and rate type are you considering? | Fixed rate, 5 years |
| Do any existing loans or app loans have a high interest rate? | No |
| Have you missed or bounced a loan repayment recently? | No |
| Do you already have a lender offer to compare? | No offer yet |

Adaptive questions shown: high-cost debt, recent bounce, lender-offer availability. Co-applicant and collateral questions were not shown.

### O1

**Borrow** (UI: “Borrowing may fit”). Engine reason: the requested amount is within the conservative safe borrowing amount and passes the stress test.

### O2

- Likely lender-sanction range: **₹15,39,076 - ₹20,90,409**
- Borrower-safe range: **₹11,18,596 - ₹13,48,651**
- Borrower should use: **the safe range**, not the lender range.
- Why: the lender estimate is repayment-capacity based and is not a recommendation to borrow the full amount. The safe ceiling also protects essentials, existing EMI, upcoming commitments, and the retained buffer.

### O3

- Fair interest-rate band: **12.0% - 17.0%** (`standard` personal-loan profile)
- APR: **Rate-only view** (unavailable)
- All-in cost: **Not available yet**
- Processing fee: **unknown** (no lender offer)
- Why: APR needs the offer plus mandatory fee fields. The app does not invent fees. Profile is `standard` rather than `strong` because documented income is not collected even with score 780.

### O4

- Safe monthly EMI ceiling: **₹27,800** (conservative/low bound)
- Tenure trade-off (principal = safe-range low):
  - 36 months: ₹39,881/month, Review
  - 48 months: ₹32,277/month, Review
  - 60 months: ₹27,800/month, Fits safety
- Stress: **Passes**; stressed monthly surplus **₹13,750**; scenarios income and expenses (fixed rate, so no rate shock).
- Why: the ceiling is the lower conservative new-EMI bound after recognized income, essentials, existing EMI, upcoming obligations, and the salaried retained buffer.

### Negotiation Card

Actual card fields from this run:

- Product: `personalLoan`
- Recommended amount: ₹11,18,596 - ₹13,48,651
- Safe EMI ceiling: ₹27,800
- Fair rate range: 12.0% - 17.0%
- All-in cost: Not available yet
- APR: Rate-only view
- Preferred tenure: 60 months
- Stress result: Passes
- Key reasons (first four shown): standard evidence/repayment profile; conservative EMI ceiling from income, essentials, existing EMIs, and buffer; lender-sanction estimate is not approval; rate-only cost until fees are known.
- Ask for / negotiate: keep EMI at or below the safe ceiling; ask for a rate within 12.0% - 17.0%; request the complete fee schedule before comparing APR; compare the 60-month option with shorter tenures; do not treat the lender sanction range as a safe recommendation.
- Unknowns and cautions: full APR needs mandatory fee and lender-collected charge information.
- Assumptions: rate range includes model assumptions, not a lender quote; APR not estimated without complete fees; safe amount preserves the configured buffer and is not an approval prediction.
- Confidence: medium

### Important unknowns / confidence

Unknown in this run: documented income, employment tenure, age, emergency savings, processing fee and other offer fields, and total essentials beyond the rent figure (₹35,000 assumed). Missing fees keep APR rate-only. Medium confidence is evidence completeness, not creditworthiness.

## Ravi

**Persona:** 42, Mysuru; self-employed kirana store, 14 years; cash income ₹40,000–80,000/month; ITR ₹4,20,000/year; unencumbered shop ~₹45,00,000; no formal loan/no score; wife earns ₹18,000; wants ₹15,00,000 for stock line + delivery vehicle.

### Questions asked

| App question | Answer used |
| --- | --- |
| How do you earn most of your income? | Self-employed or business |
| What is the loan for? | Business |
| How much do you want to borrow? | ₹15,00,000 |
| What is your usual monthly income? | ₹40,000 - ₹80,000 |
| How much do essential household expenses cost each month? | ₹10,000. Completion assumption: household expenses are not in the brief. |
| How much do you currently pay toward loans each month? | ₹0 because no formal loan is reported. |
| Do you have other known monthly commitments starting soon? | ₹0. Completion assumption: none specified. |
| How stable is that income month to month? | Variable |
| Which best describes your credit history? | I have no known credit history |
| What repayment term and rate type are you considering? | I have not decided |
| Will another applicant contribute regular monthly income? | ₹18,000 |
| Do you have collateral that could support a secured business loan? | Property |
| What is the approximate current value of that collateral? | ₹45,00,000 |
| Is ownership of the collateral documented and verifiable? | Yes |
| Is the collateral free from another loan or legal charge? | Yes |
| Do you already have a lender offer to compare? | No offer yet |

Adaptive questions shown: co-applicant income, collateral type/value/ownership/unencumbered, lender-offer availability. High-cost-debt and recent-bounce questions were not shown because existing EMIs were ₹0. ITR is not a flow field and was not used.

### O1

**Borrow less** (UI: “Consider borrowing less”). Engine reason: the requested amount exceeds the conservative safe borrowing amount; reduce the amount or extend the assessment with more information.

### O2

- Likely lender-sanction range: **₹13,11,024 - ₹27,00,000**
- Borrower-safe range: **₹10,19,686 - ₹22,26,114**
- Borrower should use: **the safe range and reduce the request**, with the **₹15,225** EMI ceiling as the binding monthly limit.
- Why: the route is `loanAgainstProperty` because ownership is verified and unencumbered, but collateral does not replace repayment capacity. The lender high is capped by the 45–60% collateral LTV reference (₹27,00,000).

### O3

- Fair interest-rate band: **12.5% - 13.0%** (`limited` loan-against-property profile)
- APR: **Rate-only view** (unavailable)
- All-in cost: **Not available yet**
- Processing fee: **unknown** (no lender offer)
- Why: no-score credit widens the profile to `limited` rather than inventing a poor score. No offer/fees, so no APR.

### O4

- Safe monthly EMI ceiling: **₹15,225**
- Tenure trade-off (undecided tenure uses the longest configured LAP option for modelling):
  - 60 months: ₹23,201/month, Review
  - 84 months: ₹18,550/month, Review
  - 120 months: ₹15,225/month, Fits safety
- Stress: **Passes**; stressed monthly surplus **₹8,575**; scenarios income and expenses. Rate stress is omitted because rate type was not decided.
- Why: the ceiling uses recognized variable self-employed income (including known co-applicant income), household expenses, zero existing EMI, upcoming obligations, and the self-employed retained buffer.

### Negotiation Card

- Product: `loanAgainstProperty`
- Recommended amount: ₹10,19,686 - ₹22,26,114
- Safe EMI ceiling: ₹15,225
- Fair rate range: 12.5% - 13.0%
- All-in cost: Not available yet
- APR: Rate-only view
- Preferred tenure: 120 months
- Stress result: Passes
- Key reasons (first four shown): limited evidence/repayment profile; unknown credit is not treated as a poor score; conservative EMI ceiling; secured-route estimate capped by repayment capacity and verified collateral.
- Ask for / negotiate: keep EMI at or below the safe ceiling; ask for a rate within 12.5% - 13.0%; request the complete fee schedule; compare the 120-month option with shorter tenures; do not treat the lender sanction range as a safe recommendation.
- Unknowns and cautions: unknown/unavailable credit; full APR needs mandatory fees.
- Assumptions: same rate/APR/buffer limitations as Priya.
- Confidence: medium

### Important unknowns / confidence

Unused/uncollected: ITR, cash-income documentation, business tenure, household expenses (₹10,000 assumed), rate type, preferred tenure, and all offer fees. Variable income and missing fees keep confidence medium. Collateral value is a borrower estimate, not a valuation.

## Anita

**Persona:** 35, Hubballi; delivery rider + home tailoring; ₹26,000–30,000/month; two children; husband unemployed 8 months; three app loans; ₹35,000 outstanding at 30%+; one EMI bounced last month; wants ₹1,50,000 for an electric scooter.

### Questions asked

| App question | Answer used |
| --- | --- |
| How do you earn most of your income? | Variable or informal income |
| What is the loan for? | Vehicle |
| How much do you want to borrow? | ₹1,50,000 |
| What is your usual monthly income? | ₹26,000 - ₹30,000 |
| How much do essential household expenses cost each month? | ₹20,000. Completion assumption: household expenses are not in the brief. |
| How much do you currently pay toward loans each month? | ₹8,000. Completion assumption: the brief gives ₹35,000 outstanding, not a monthly EMI. |
| Do you have other known monthly commitments starting soon? | ₹0. Completion assumption: none specified. |
| How stable is that income month to month? | Variable |
| Which best describes your credit history? | I do not know |
| What repayment term and rate type are you considering? | Fixed rate, 3 years |
| Do any existing loans or app loans have a high interest rate? | Yes |
| Have you missed or bounced a loan repayment recently? | Yes |
| Do you already have a lender offer to compare? | No offer yet |

Adaptive questions shown: high-cost debt, recent bounce, lender-offer availability. Co-applicant and collateral questions were not shown. Dependants and spouse unemployment are not flow fields.

### O1

**Do not borrow** (UI: “Pause before borrowing”). Engine reason: do not add new borrowing now because a recent repayment problem and high-cost debt indicate acute repayment stress.

### O2

- Likely lender-sanction range: **₹0 - ₹74,320**
- Borrower-safe range: **₹0**
- Borrower should use: **₹0 and avoid adding new borrowing now.**
- Why: conservative safe EMI is zero. A lender-side estimate can still show a non-zero high; that is not a safe recommendation.

### O3

- Fair interest-rate band: **21.0% - 26.1%** (`stressed` two-wheeler profile)
- APR: **Rate-only view** (unavailable)
- All-in cost: **Not available yet**
- Processing fee: **unknown** (no lender offer)
- Why: known high-cost debt and bounce set the stressed band. An offered rate would not make an unaffordable loan safe. Fees are also missing.

### O4

- Safe monthly EMI ceiling: **₹0**
- Tenure trade-off (safe principal ₹0):
  - 24 months: ₹0/month, Review (stress does not pass)
  - 36 months: ₹0/month, Review
  - 48 months: ₹0/month, Review
- Stress: **Does not pass**; stressed monthly surplus **-₹18,300**; scenarios income and expenses.
- Why: existing EMI plus essentials leave no conservative capacity for a new EMI; after income and expense shocks the surplus is negative.

### Negotiation Card

- Product: `twoWheelerLoan`
- Recommended amount: ₹0
- Safe EMI ceiling: ₹0
- Fair rate range: 21.0% - 26.1%
- All-in cost: Not available yet
- APR: Rate-only view
- Preferred tenure: Not available
- Stress result: Does not pass
- Key reasons (first four shown): stressed evidence/repayment profile; unknown credit is not treated as a poor score; conservative EMI ceiling (blocking); lender-sanction estimate is not approval.
- Ask for / negotiate: keep EMI at or below the safe ceiling (₹0); ask whether a rate within 21.0% - 26.1% is even relevant; request the complete fee schedule rather than a headline rate. The card still lists the generic EMI/rate points; the verdict is not to add a loan.
- Unknowns and cautions: unknown credit; missing fees; stress surplus not retained; do-not-borrow for acute repayment stress.
- Assumptions: same rate/APR/buffer limitations as the other personas.
- Confidence: medium

### Important unknowns / confidence

Unknown/uncollected: actual monthly EMI on the ₹35,000 outstanding, household expenses (₹20,000 assumed), credit score, dependants, spouse income, and offer fees. The known bounce plus high-cost debt is enough for do-not-borrow even while confidence stays medium because confidence measures missing fields, not repayment risk.

## Cross-persona notes

- Priya, Ravi, and Anita take distinct adaptive paths and distinct verdicts: borrow / borrow less / do not borrow.
- Lender-sanction and borrower-safe amounts stay separate on every run.
- No lender offer was entered, so all three stay rate-only with unavailable all-in cost.
- Numbers above are the current implementation with the stated completion assumptions. They are not claims about actual lender approval.
