# Borrower Copilot

Borrower Copilot is a borrower-first financial self-assessment for Indian borrowers. It helps someone decide whether to borrow, compare a possible lender sanction with a safer personal ceiling, negotiate a fair rate and EMI, and carry a concise Negotiation Card into a lender conversation.

It is a deterministic decision aid, not a lender underwriting system, credit bureau, loan marketplace, or approval guarantee.

## Assignment Coverage

- **O1 — Borrow / don't borrow / borrow less:** The assessment engine returns a verdict with an explanation. `dontBorrow` is reachable for affordability failure, failed stress, and known repayment stress.
- **O2 — Lender sanction vs borrower-safe amount:** Results show separate estimated lender-sanction and conservative safe-borrowing ranges. The safe amount is presented as the borrower ceiling.
- **O3 — Fair rate + all-in APR/cost:** Results show a fair rate band. When a lender offer includes amount, rate, processing fee, third-party charges, and known taxes, the engine calculates APR and all-in cost. Missing fees produce an honest rate-only view.
- **O4 — EMI, tenure, and stress:** Results show a recommended maximum EMI, configured tenure trade-offs, and income/expense stress, with an additional rate shock for explicitly floating-rate requests.
- **Negotiation Card:** The card includes the modelled borrower position, safe EMI, rate range, APR/cost status, tenure, stress result, reasons, negotiation points, unknowns, assumptions, confidence, and a lender-offer checklist. It can be printed or shared/copied.

## Key Design Decisions

- Financial decisions are deterministic and live outside React in `src/domain/borrower/engine.ts` and `src/rules/config.ts`.
- The question flow is adaptive: self-employed business borrowers can see co-applicant and collateral questions; borrowers with existing debt can see high-cost-debt and repayment-history questions.
- Unknown values are explicit and are never silently converted to zero.
- Lender eligibility is kept separate from borrower-safe affordability throughout the engine and UI.
- Ranges are preserved where the borrower provides a minimum and maximum. Missing evidence blocks or widens the relevant output and lowers confidence rather than narrowing certainty.

## Tech Stack

- React 19
- TypeScript
- Vite
- Node's built-in test runner
- CSS, with no backend or database

## Architecture

```text
React UI
  -> adaptive question flow
  -> profile and offer normalization
  -> deterministic assessment engine
  -> results and explanations
  -> printable/shareable Negotiation Card
```

The engine uses reducing-balance EMI, present-value, monthly IRR, configured affordability and lender-cap rules, product routing, stress testing, and structured explanation metadata.

## Local Setup

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm run build:web
```

The compiled TypeScript/domain build is available through:

```bash
npm run build
```

## Testing

Run the complete suite:

```bash
npm test
```

This type-checks the project and runs the compiled Node test suite. The current suite has 24 passing tests covering:

- EMI, present-value, and APR/IRR calculations
- Unknown existing EMI and upcoming-obligation safety behavior
- Priya-like salaried behavior
- Ravi-like self-employed secured routing
- Anita-like informal-income debt stress
- Adaptive question visibility and normalization
- Unknown, range, numeric credit-score, and undecided-term handling
- Lender-offer normalization, estimated APR, and rate-only fallback
- Configurable rule behavior

The three assignment personas have also been run through the application flow manually during end-to-end validation:

- **Priya:** salaried wedding-loan path; personal-loan route; borrowing can fit under the safe ceiling.
- **Ravi:** self-employed business path; verified property collateral; loan-against-property route; borrow less.
- **Anita:** variable/informal vehicle path; high-cost debt and recent bounce; do not borrow.

## Limitations

- No bureau pull or external credit-score verification
- No login, account, backend, or personal-data storage
- No lender integration or live lender-offer feed
- No production underwriting decision or approval guarantee
- Market rate envelopes and judgement-based thresholds require refresh and review before production
- APR is estimated only when the borrower supplies complete lender-offer fee information; otherwise the app shows a rate-only view
- The assignment personas do not provide every financial input, so any missing persona value remains unknown or must be supplied by the user

The application intentionally does not add authentication, payments, lender APIs, ML scoring, or other infrastructure outside the challenge scope.
