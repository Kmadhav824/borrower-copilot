# Borrower Copilot: Five-Minute Walkthrough

## 1. Product thesis

A lender’s possible maximum is not a safe recommendation. Borrower Copilot gives an Indian borrower a clear position before that conversation: whether to borrow, what a lender might sanction, what they can safely carry, what rate and EMI to negotiate, and a concise Negotiation Card to take into the meeting.

## 2. How the borrower flow works

The app opens with a short introduction, then asks about 10 core questions one at a time. Answers can be known values, ranges, or unknown. Unknown is never converted to zero. Adaptive questions appear only when they can change an output:

- Self-employed business borrowers can add co-applicant income and collateral.
- Borrowers with existing EMIs can add high-cost-debt and recent-bounce signals.
- Borrowers with a lender offer can add rate and fee fields for APR.

The borrower can go back, review, submit, and print or share the Negotiation Card. There is no login or stored personal data.

## 3. One short example of the reasoning

Priya’s requested ₹8,00,000 wedding loan can fit. The model still splits two ceilings: likely sanction about ₹15.4–20.9 lakh versus a safe range of about ₹11.2–13.5 lakh. She should use the safe range. The EMI ceiling is ₹27,800 after recognized income, essentials, her ₹14,000 car EMI, and a retained buffer. Only the 60-month option fits that ceiling; 36- and 48-month EMIs do not. Because she has no lender offer, APR stays rate-only.

## 4. Architecture

```text
React / Vite UI
  -> adaptive question flow and normalization
  -> deterministic TypeScript assessment engine
  -> structured explanations
  -> results + Negotiation Card
```

Rules live in `src/rules/config.ts`. Calculations live outside React. There is no backend, database, authentication, bureau API, or lender API.

## 5. Key financial-rule decisions

- Safe debt-service caps are stricter than estimated lender caps.
- Income recognition, buffers, and stress shocks vary by salaried, self-employed, and informal income.
- Existing EMIs and upcoming obligations reduce safe affordability; unknown upcoming obligations block the safe amount instead of becoming zero.
- Fair rates are ranges. Verified collateral can route a business request to loan-against-property and cap the lender estimate with an LTV reference.
- APR uses monthly IRR on net disbursal only when amount, rate, and all mandatory fees are known.
- Stress applies income and expense shocks, plus a floating-rate shock only when the borrower explicitly chooses floating.

Details are in `RULES.md`.

## 6. What I would build next

- Stronger, dated lender/product market-rate data with retained sources
- Broader product coverage and more complete offer comparison
- More comprehensive validation against real borrower cases
- Browser automation for the three personas and unknown/offer paths
- Production-grade privacy, consent, and data-handling infrastructure

## 7. What I intentionally cut from the 4-day scope

Login, personal-data storage, backend services, lender integrations, bureau pulls, payments, production databases, ML credit scoring, and generic AI chat. None is required for the assignment’s decision aid.

## 8. Important limitations / honesty points

This is a transparent product model, not financial advice or underwriting. Market envelopes and judgement thresholds need review before production. Persona briefs omit some required inputs; the run-throughs name those completion assumptions. APR cannot be estimated honestly without a complete fee schedule. Confidence is evidence completeness, not creditworthiness or approval probability. Do-not-borrow is an intended outcome, as Anita’s run shows.
