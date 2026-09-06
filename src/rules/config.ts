import type { IncomeType, ProductType, SourceType } from "../domain/borrower/types.js";

export interface RuleDefinition<T> {
  readonly id: string;
  readonly value: T;
  readonly sourceType: SourceType;
  readonly rationale: string;
  readonly limitations: string;
}

export interface EngineRules {
  readonly safeDebtServiceCaps: RuleDefinition<Record<IncomeType, number>>;
  readonly lenderDebtServiceCaps: RuleDefinition<Record<IncomeType, readonly [number, number]>>;
  readonly retainedBufferPercent: RuleDefinition<Record<IncomeType, number>>;
  readonly incomeRecognition: RuleDefinition<Record<IncomeType, readonly [number, number]>>;
  readonly incomeShock: RuleDefinition<Record<IncomeType, number>>;
  readonly expenseShock: RuleDefinition<number>;
  readonly floatingRateShock: RuleDefinition<number>;
  readonly minimumPostStressSurplus: RuleDefinition<{ readonly absolute: number; readonly incomePercent: number }>;
  readonly collateralLtv: RuleDefinition<readonly [number, number]>;
  readonly productRateBands: RuleDefinition<Record<ProductType, readonly [number, number]>>;
  readonly profileRateBands: RuleDefinition<Record<ProductType, Record<"strong" | "standard" | "limited" | "stressed", readonly [number, number]>>>;
  readonly tenureOptions: RuleDefinition<Record<ProductType, readonly number[]>>;
  readonly confidencePenalties: RuleDefinition<Record<string, number>>;
}

const judgement = "This is a configurable borrower-protection rule, not an RBI rule or lender underwriting policy.";

export const DEFAULT_RULES: EngineRules = {
  safeDebtServiceCaps: { id: "SAFE_DEBT_SERVICE_CAP", value: { salaried: 0.4, selfEmployed: 0.35, informal: 0.3 }, sourceType: "our_judgement", rationale: "Leaves capacity for essential spending and income volatility.", limitations: judgement },
  lenderDebtServiceCaps: { id: "ESTIMATED_LENDER_DEBT_SERVICE_CAP", value: { salaried: [0.5, 0.55], selfEmployed: [0.45, 0.55], informal: [0.35, 0.45] }, sourceType: "assumption", rationale: "A broad estimate of lender debt-service practice, deliberately separate from safety.", limitations: "No universal RBI FOIR cap exists; each lender uses its own policy." },
  retainedBufferPercent: { id: "RETAINED_MONTHLY_BUFFER", value: { salaried: 0.1, selfEmployed: 0.15, informal: 0.2 }, sourceType: "our_judgement", rationale: "Retains a monthly resilience buffer after obligations.", limitations: judgement },
  incomeRecognition: { id: "INCOME_RECOGNITION", value: { salaried: [0.95, 1], selfEmployed: [0.75, 0.95], informal: [0.6, 0.8] }, sourceType: "our_judgement", rationale: "Uses less variable or less evidenced income less fully.", limitations: judgement },
  incomeShock: { id: "STRESS_INCOME_REDUCTION", value: { salaried: 0.1, selfEmployed: 0.2, informal: 0.25 }, sourceType: "our_judgement", rationale: "Tests affordability against an income interruption.", limitations: judgement },
  expenseShock: { id: "STRESS_EXPENSE_INCREASE", value: 0.1, sourceType: "our_judgement", rationale: "Tests an essential-expense increase.", limitations: judgement },
  floatingRateShock: { id: "STRESS_FLOATING_RATE_INCREASE", value: 0.02, sourceType: "our_judgement", rationale: "Provides headroom for a floating-rate change.", limitations: "RBI requires lenders to consider headroom for floating EMI loans, but does not mandate this numeric shock." },
  minimumPostStressSurplus: { id: "MINIMUM_POST_STRESS_SURPLUS", value: { absolute: 5000, incomePercent: 0.05 }, sourceType: "our_judgement", rationale: "Requires a positive residual margin after stress.", limitations: judgement },
  collateralLtv: { id: "SECURED_LTV_REFERENCE", value: [0.45, 0.6], sourceType: "our_judgement", rationale: "Caps a secured-route estimate below stated collateral value.", limitations: "Actual LTV depends on lender policy, valuation and legal verification." },
  productRateBands: { id: "MARKET_RATE_ENVELOPES", value: { personalLoan: [0.0999, 0.24], businessLoan: [0.1075, 0.225], loanAgainstProperty: [0.105, 0.13], goldLoan: [0.0875, 0.1025], twoWheelerLoan: [0.1025, 0.261] }, sourceType: "market_observation", rationale: "Dated reference envelopes from official lender disclosures researched in September 2026.", limitations: "Rates are lender- and profile-specific and must be refreshed before production." },
  profileRateBands: { id: "PROFILE_RATE_BANDS", value: {
    personalLoan: { strong: [0.105, 0.13], standard: [0.12, 0.17], limited: [0.15, 0.22], stressed: [0.18, 0.24] },
    businessLoan: { strong: [0.11, 0.14], standard: [0.13, 0.18], limited: [0.16, 0.21], stressed: [0.19, 0.225] },
    loanAgainstProperty: { strong: [0.1075, 0.1225], standard: [0.115, 0.13], limited: [0.125, 0.13], stressed: [0.13, 0.13] },
    goldLoan: { strong: [0.0875, 0.095], standard: [0.09, 0.1], limited: [0.095, 0.1025], stressed: [0.1025, 0.1025] },
    twoWheelerLoan: { strong: [0.105, 0.14], standard: [0.13, 0.18], limited: [0.17, 0.23], stressed: [0.21, 0.261] }
  }, sourceType: "our_judgement", rationale: "Turns market envelopes into explainable negotiating bands.", limitations: judgement },
  tenureOptions: { id: "PRODUCT_TENURES", value: { personalLoan: [36, 48, 60], businessLoan: [36, 48, 60], loanAgainstProperty: [60, 84, 120], goldLoan: [12, 24, 36], twoWheelerLoan: [24, 36, 48] }, sourceType: "assumption", rationale: "Keeps initial comparisons limited and comprehensible.", limitations: "Actual product tenures vary by lender." },
  confidencePenalties: { id: "CONFIDENCE_PENALTIES", value: { unknownIncome: 35, unknownExpenses: 20, unknownExistingEmis: 25, unknownCredit: 10, unknownFees: 10, unverifiedCollateral: 15, variableIncome: 10 }, sourceType: "our_judgement", rationale: "Confidence expresses evidence completeness rather than creditworthiness.", limitations: judgement }
};
