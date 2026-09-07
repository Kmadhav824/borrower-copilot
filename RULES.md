# Borrower Copilot Rules

This document records the rules actually used by `src/rules/config.ts` and the calculation engine. Percentages are decimals in code: `0.40` means 40%. These are borrower-facing estimates, not lender approvals or regulatory determinations.

## Rule Table

| What | Value / range | Why | Source / classification |
| --- | --- | --- | --- |
| Safe debt-service cap | Salaried 40%; self-employed 35%; informal 30% | Limits new debt service while leaving room for essential spending and volatility. | My judgement; configurable borrower-protection rule, not an RBI rule. |
| Estimated lender debt-service cap | Salaried 50-55%; self-employed 45-55%; informal 35-45% | Produces a broad lender-sanction estimate deliberately separate from safe affordability. | Product assumption. There is no universal RBI FOIR cap; lenders use their own policies. |
| Retained monthly buffer | Salaried 10%; self-employed 15%; informal 20% of recognized income | Preserves monthly resilience after expenses, existing EMIs, upcoming obligations, and the proposed EMI. | My judgement. |
| Income recognition | Salaried 95-100%; self-employed 75-95%; informal 60-80% | Recognizes less variable or less evidenced income less fully. | My judgement. |
| Income stress shock | Salaried income -10%; self-employed -20%; informal -25% | Tests whether the recommendation survives an income interruption. | My judgement. |
| Essential-expense stress shock | Essential expenses +10% | Tests resilience against higher household costs. | My judgement. |
| Floating-rate stress shock | Annual rate +2 percentage points when the request is explicitly floating-rate | Provides headroom for a rate change in the stress test. | My judgement. RBI-style headroom is acknowledged, but this numeric shock is not presented as an RBI mandate. |
| Minimum post-stress surplus | Greater of INR 5,000 or 5% of stressed income | Requires a residual margin after income, expenses, existing EMIs, and stressed new EMI. | My judgement. |
| Secured-route collateral LTV reference | 45-60% of verified collateral value | Caps a secured-route lender estimate below the stated collateral value. | My judgement. Actual LTV depends on lender policy, valuation, legal checks, and product. |

## Market Rate Envelopes

These are dated reference envelopes used to bound the rate bands. They are not quotes and must be refreshed before production. The implementation records them as market observations based on lender disclosures researched in September 2026; source URLs are not retained in this repository.

| Product | Market envelope |
| --- | ---: |
| Personal loan | 9.99-24.00% |
| Business loan | 10.75-22.50% |
| Loan against property | 10.50-13.00% |
| Gold loan | 8.75-10.25% |
| Two-wheeler loan | 10.25-26.10% |

## Profile Rate Bands

The engine selects a profile using available credit, income-stability, documentation, and repayment-risk evidence, then intersects the profile band with the product market envelope.

| Product | Strong | Standard | Limited | Stressed |
| --- | ---: | ---: | ---: | ---: |
| Personal loan | 10.50-13.00% | 12.00-17.00% | 15.00-22.00% | 18.00-24.00% |
| Business loan | 11.00-14.00% | 13.00-18.00% | 16.00-21.00% | 19.00-22.50% |
| Loan against property | 10.75-12.25% | 11.50-13.00% | 12.50-13.00% | 13.00-13.00% |
| Gold loan | 8.75-9.50% | 9.00-10.00% | 9.50-10.25% | 10.25-10.25% |
| Two-wheeler loan | 10.50-14.00% | 13.00-18.00% | 17.00-23.00% | 21.00-26.10% |

A profile is `stressed` when a recent repayment bounce or high-cost debt is known true. A profile is `strong` when credit score is known at least 750, income is stable, and documented income is present. Unknown/no-history credit or unknown income stability produces `limited` unless an adverse known signal produces `stressed`; otherwise the profile is `standard`.

## Tenure Assumptions

The engine compares only these product options to keep the first assessment understandable. The selected requested tenure is matched to the closest configured option; unknown tenure uses the longest configured option.

| Product | Tenure options in months |
| --- | ---: |
| Personal loan | 36, 48, 60 |
| Business loan | 36, 48, 60 |
| Loan against property | 60, 84, 120 |
| Gold loan | 12, 24, 36 |
| Two-wheeler loan | 24, 36, 48 |

These are product assumptions. Actual lender tenures vary.

## Stress and Verdict Behavior

- Fixed-rate requests stress income and essential expenses.
- Floating-rate requests stress income, essential expenses, and the configured rate increase.
- A stress result passes only when stressed surplus meets the minimum post-stress surplus.
- A zero safe EMI or failed stress test produces `dontBorrow`.
- If a recent bounce and high-cost debt are both known true, the engine can produce `dontBorrow` for acute repayment stress.
- If required affordability evidence is missing, the engine produces `needsInformation`; it does not replace unknowns with zero.
- If the requested amount exceeds the conservative safe range, the verdict can be `borrowLess`.
- Otherwise, a request within the conservative safe amount and passing stress produces `borrow`.

## APR and Cost Rules

The engine uses reducing-balance EMI calculations and monthly IRR. When the requested amount and all lender-offer fee fields are known, APR is calculated from net disbursal after:

- Processing fee
- Lender-collected third-party charges
- Applicable known taxes

If the lender offer is absent, the offered rate is unknown, or any mandatory fee field is unknown, the result is `rateOnly`: modelled repayment from the fair-rate band may still be used internally, but APR and all-in cost remain unavailable. The application never substitutes a modelled rate for an offered APR and never invents missing fees.

The optional UI offer branch accepts the user-facing annual rate as a percentage and normalizes `12` to the engine decimal `0.12`.

## Confidence Penalties

Confidence starts at 100 and applies these penalties:

| Missing / uncertain evidence | Penalty |
| --- | ---: |
| Unknown income | 35 |
| Unknown essential expenses | 20 |
| Unknown existing EMIs | 25 |
| Unknown or unavailable credit | 10 |
| Missing/unknown processing fees | 10 |
| Unverified collateral | 15 |
| Variable or unknown income stability | 10 |

Final confidence is high at 80 or above, medium at 55-79, and low below 55. Confidence expresses evidence completeness, not creditworthiness or approval likelihood.

## Unknown and Range Handling

- Numeric answers are `known`, `range`, or `unknown`.
- Unknown is never converted to zero.
- Known ranges are preserved through normalization and calculations.
- Unknown upcoming monthly obligations block safe-affordability calculation rather than becoming zero.
- Unknown existing EMIs block both safe-affordability and lender-sanction estimates.
- Unknown credit is not treated as a poor score; it widens the rate/confidence view.
- Unknown income type or loan purpose remains a routing blocker because choosing a fallback would invent a borrower classification or loan purpose.
- An undecided rate type and tenure are allowed; the engine uses configured tenure comparison and omits floating-rate stress unless floating is explicitly selected.
- Collateral is `none` when the secured-business questions were not asked. `unknown` is used only when the borrower answers that they are not sure.

## Limitations

These rules are a transparent product model for a take-home challenge. They are not lender underwriting policy, financial advice, an RBI approval test, or a guarantee of sanction, rate, APR, or affordability. Market bands, assumptions, and thresholds should be reviewed with current source material before production use.
