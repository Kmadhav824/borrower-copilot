/** Explicitly represents information the borrower has not provided. */
export type Unknown = { readonly kind: "unknown"; readonly reason?: string };
export type Known = { readonly kind: "known"; readonly value: number };
export type KnownRange = {
  readonly kind: "range";
  readonly low: number;
  readonly high: number;
};
export type NumericInput = Unknown | Known | KnownRange;

export type IncomeType = "salaried" | "selfEmployed" | "informal";
export type ProductType =
  | "personalLoan"
  | "businessLoan"
  | "loanAgainstProperty"
  | "goldLoan"
  | "twoWheelerLoan";
export type RateType = "fixed" | "floating";
export type CreditScoreStatus = "known" | "unknown" | "noHistory";
export type ConfidenceLevel = "high" | "medium" | "low";
export type BorrowingVerdict = "borrow" | "borrowLess" | "dontBorrow" | "needsInformation";
export type SourceType =
  | "regulatory_source_backed"
  | "market_observation"
  | "assumption"
  | "our_judgement";

export interface LoanRequest {
  readonly requestedAmount: NumericInput;
  readonly purpose: "personal" | "wedding" | "business" | "vehicle" | "emergency" | "other";
  readonly productIntent: ProductType | "unsure";
  readonly preferredTenureMonths: NumericInput;
  readonly rateType: RateType | "unknown";
}

export interface FinancialInputs {
  readonly monthlyIncome: NumericInput;
  readonly documentedMonthlyIncome: NumericInput;
  readonly existingEmis: NumericInput;
  readonly essentialMonthlyExpenses: NumericInput;
  readonly emergencySavingsMonths: NumericInput;
  readonly upcomingMonthlyObligations: NumericInput;
  readonly coApplicantMonthlyIncome: NumericInput;
}

export interface CreditInputs {
  readonly scoreStatus: CreditScoreStatus;
  readonly score: NumericInput;
  readonly recentBounce: boolean | "unknown";
  readonly highCostDebtPresent: boolean | "unknown";
}

export interface CollateralInputs {
  readonly type: "property" | "gold" | "none" | "unknown";
  readonly estimatedValue: NumericInput;
  readonly ownershipVerified: boolean | "unknown";
  readonly unencumbered: boolean | "unknown";
}

export interface BorrowerProfile {
  readonly age: NumericInput;
  readonly incomeType: IncomeType;
  readonly employmentOrBusinessTenureMonths: NumericInput;
  readonly incomeStability: "stable" | "variable" | "unknown";
  readonly dependants: NumericInput;
  readonly financial: FinancialInputs;
  readonly credit: CreditInputs;
  readonly collateral: CollateralInputs;
}

export interface LoanOfferInputs {
  readonly nominalAnnualRate: NumericInput;
  readonly processingFee: NumericInput;
  readonly lenderCollectedThirdPartyCharges: NumericInput;
  readonly applicableKnownTaxes: NumericInput;
}

export interface MonetaryRange {
  readonly low: number;
  readonly high: number;
  readonly currency: "INR";
}

export interface PercentageRange {
  readonly low: number;
  readonly high: number;
}

export interface RateBand {
  readonly low: number;
  readonly high: number;
  readonly product: ProductType;
  readonly profile: "strong" | "standard" | "limited" | "stressed";
  readonly sourceType: SourceType;
}

export interface ExplanationMetadata {
  readonly id: string;
  readonly severity: "info" | "caution" | "blocking";
  readonly output: "eligibility" | "affordability" | "rate" | "apr" | "emi" | "stress" | "verdict";
  readonly ruleId: string;
  readonly inputReferences: readonly string[];
  readonly message: string;
}

export interface EligibilityResult {
  readonly likelySanction: MonetaryRange | null;
  readonly lenderEmiCapacity: MonetaryRange | null;
  readonly productRoute: ProductType;
  readonly reasons: readonly ExplanationMetadata[];
}

export interface AffordabilityResult {
  readonly safeBorrowing: MonetaryRange | null;
  readonly safeEmi: MonetaryRange | null;
  readonly recommendedMaximumEmi: number | null;
  readonly reasons: readonly ExplanationMetadata[];
}

export interface APRResult {
  readonly status: "estimated" | "rateOnly" | "unavailable";
  readonly apr: PercentageRange | null;
  readonly totalRepayment: MonetaryRange | null;
  readonly allInCost: MonetaryRange | null;
  readonly netDisbursed: MonetaryRange | null;
  readonly reasons: readonly ExplanationMetadata[];
}

export interface StressResult {
  readonly passes: boolean | null;
  readonly stressedMonthlySurplus: MonetaryRange | null;
  readonly scenarios: readonly ("income" | "rate" | "expenses")[];
  readonly reasons: readonly ExplanationMetadata[];
}

export interface TenureOption {
  readonly months: number;
  readonly emi: number;
  readonly totalRepayment: number;
  readonly totalInterest: number;
  readonly passesSafety: boolean;
  readonly passesStress: boolean | null;
}

export interface NegotiationCardData {
  readonly product: ProductType;
  readonly requestedAmount: MonetaryRange | null;
  readonly likelyLenderSanction: MonetaryRange | null;
  readonly safeBorrowing: MonetaryRange | null;
  readonly fairRate: RateBand;
  readonly estimatedApr: APRResult;
  readonly recommendedMaximumEmi: number | null;
  readonly suggestedTenureMonths: number | null;
  readonly stress: StressResult;
  readonly confidence: ConfidenceLevel;
  readonly keyReasons: readonly ExplanationMetadata[];
}

export interface AssessmentResult {
  readonly verdict: BorrowingVerdict;
  readonly eligibility: EligibilityResult;
  readonly affordability: AffordabilityResult;
  readonly fairRate: RateBand;
  readonly apr: APRResult;
  readonly stress: StressResult;
  readonly tenureOptions: readonly TenureOption[];
  readonly confidence: ConfidenceLevel;
  readonly reasons: readonly ExplanationMetadata[];
  readonly negotiationCard: NegotiationCardData;
}
