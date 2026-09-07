import assert from "node:assert/strict";
import test from "node:test";
import { assessBorrower } from "../src/domain/borrower/engine.js";
import type { AssessmentInput, } from "../src/domain/borrower/engine.js";
import { DEFAULT_RULES } from "../src/rules/config.js";
import type { BorrowerProfile, LoanOfferInputs, LoanRequest, NumericInput } from "../src/domain/borrower/types.js";

const known = (value: number): NumericInput => ({ kind: "known", value });
const unknown = (): NumericInput => ({ kind: "unknown" });
const range = (low: number, high: number): NumericInput => ({ kind: "range", low, high });

const offer: LoanOfferInputs = {
  nominalAnnualRate: known(0.12),
  processingFee: known(6_500),
  lenderCollectedThirdPartyCharges: known(0),
  applicableKnownTaxes: known(0)
};

function request(amount: number, purpose: LoanRequest["purpose"], productIntent: LoanRequest["productIntent"], tenure = 60): LoanRequest {
  return { requestedAmount: known(amount), purpose, productIntent, preferredTenureMonths: known(tenure), rateType: "fixed" };
}

function profile(overrides: Partial<BorrowerProfile> = {}): BorrowerProfile {
  return {
    age: known(30), incomeType: "salaried", employmentOrBusinessTenureMonths: known(60), incomeStability: "stable",
    dependants: known(0),
    financial: { monthlyIncome: known(110_000), documentedMonthlyIncome: known(110_000), existingEmis: known(14_000), essentialMonthlyExpenses: known(35_000), emergencySavingsMonths: known(4), upcomingMonthlyObligations: known(0), coApplicantMonthlyIncome: unknown() },
    credit: { scoreStatus: "known", score: known(780), recentBounce: false, highCostDebtPresent: false },
    collateral: { type: "none", estimatedValue: unknown(), ownershipVerified: "unknown", unencumbered: "unknown" },
    ...overrides
  };
}

test("Priya-like strong borrower has a safe amount below likely lender sanction", () => {
  const result = assessBorrower({ borrower: profile(), request: request(800_000, "wedding", "personalLoan"), offer });
  assert.equal(result.verdict, "borrow");
  assert.notEqual(result.eligibility.likelySanction, null);
  assert.notEqual(result.affordability.safeBorrowing, null);
  assert.ok(result.eligibility.likelySanction!.high > result.affordability.safeBorrowing!.high);
  assert.ok(result.affordability.recommendedMaximumEmi! > 0);
  assert.equal(result.apr.status, "estimated");
  assert.ok(result.apr.apr!.low > 0.12);
  assert.equal(result.stress.passes, true);
  assert.equal(result.tenureOptions.length, 3);
  assert.ok(result.tenureOptions.some((option) => option.passesSafety));
});

test("Ravi-like borrower routes to a secured business product when property is verified", () => {
  const ravi = profile({
    age: known(42), incomeType: "selfEmployed", incomeStability: "variable", employmentOrBusinessTenureMonths: known(168),
    financial: { monthlyIncome: range(40_000, 80_000), documentedMonthlyIncome: known(35_000), existingEmis: known(0), essentialMonthlyExpenses: known(10_000), emergencySavingsMonths: unknown(), upcomingMonthlyObligations: known(0), coApplicantMonthlyIncome: known(18_000) },
    credit: { scoreStatus: "noHistory", score: unknown(), recentBounce: false, highCostDebtPresent: false },
    collateral: { type: "property", estimatedValue: known(4_500_000), ownershipVerified: true, unencumbered: true }
  });
  const result = assessBorrower({ borrower: ravi, request: request(1_500_000, "business", "unsure", 120), offer });
  assert.equal(result.eligibility.productRoute, "loanAgainstProperty");
  assert.notEqual(result.eligibility.likelySanction, null);
  assert.equal(result.verdict, "borrowLess");
  assert.ok(result.eligibility.likelySanction!.high <= 4_500_000 * 0.6);
  assert.ok(result.reasons.some((item) => item.id === "SECURED_ROUTE_CAP"));
});

test("Anita-like debt stress can produce do-not-borrow", () => {
  const anita = profile({
    age: known(35), incomeType: "informal", incomeStability: "variable", dependants: known(2),
    financial: { monthlyIncome: range(26_000, 30_000), documentedMonthlyIncome: unknown(), existingEmis: known(8_000), essentialMonthlyExpenses: known(20_000), emergencySavingsMonths: known(0), upcomingMonthlyObligations: known(0), coApplicantMonthlyIncome: unknown() },
    credit: { scoreStatus: "unknown", score: unknown(), recentBounce: true, highCostDebtPresent: true }
  });
  const result = assessBorrower({ borrower: anita, request: request(150_000, "vehicle", "twoWheelerLoan", 36), offer });
  assert.equal(result.verdict, "dontBorrow");
  assert.ok(result.reasons.some((item) => item.id === "VERDICT_DONT_BORROW"));
});

test("unknown existing EMI is never treated as zero", () => {
  const borrower = profile({ financial: { ...profile().financial, existingEmis: unknown() } });
  const result = assessBorrower({ borrower, request: request(300_000, "personal", "personalLoan"), offer });
  assert.equal(result.affordability.safeBorrowing, null);
  assert.equal(result.eligibility.likelySanction, null);
  assert.equal(result.verdict, "needsInformation");
  assert.ok(result.reasons.some((item) => item.id === "SAFE_EXISTING_EMIS_UNKNOWN"));
});

test("unknown upcoming obligations cannot increase safe affordability", () => {
  const borrower = profile({ financial: { ...profile().financial, upcomingMonthlyObligations: unknown() } });
  const result = assessBorrower({ borrower, request: request(300_000, "personal", "personalLoan"), offer });

  assert.equal(result.affordability.safeBorrowing, null);
  assert.equal(result.affordability.safeEmi, null);
  assert.equal(result.affordability.recommendedMaximumEmi, null);
  assert.equal(result.stress.passes, null);
  assert.equal(result.verdict, "needsInformation");
  assert.notEqual(result.eligibility.likelySanction, null);
  assert.ok(result.reasons.some((item) => item.id === "SAFE_UPCOMING_OBLIGATIONS_UNKNOWN"));
});

test("known upcoming obligations continue to reduce safe affordability", () => {
  const baseline = assessBorrower({ borrower: profile(), request: request(300_000, "personal", "personalLoan"), offer });
  const borrower = profile({ financial: { ...profile().financial, upcomingMonthlyObligations: known(30_000) } });
  const result = assessBorrower({ borrower, request: request(300_000, "personal", "personalLoan"), offer });

  assert.ok(result.affordability.recommendedMaximumEmi! < baseline.affordability.recommendedMaximumEmi!);
  assert.ok(result.affordability.safeBorrowing!.high < baseline.affordability.safeBorrowing!.high);
});

test("unknown mandatory fees return rate-only cost rather than fabricated APR", () => {
  const unknownFeeOffer: LoanOfferInputs = { ...offer, processingFee: unknown() };
  const result = assessBorrower({ borrower: profile(), request: request(500_000, "personal", "personalLoan"), offer: unknownFeeOffer });
  assert.equal(result.apr.status, "rateOnly");
  assert.equal(result.apr.apr, null);
  assert.ok(result.reasons.some((item) => item.id === "APR_FEES_UNKNOWN"));
});

test("unknown offered rate does not borrow the modelled fair rate as APR", () => {
  const unknownRateOffer: LoanOfferInputs = { ...offer, nominalAnnualRate: unknown() };
  const result = assessBorrower({ borrower: profile(), request: request(500_000, "personal", "personalLoan"), offer: unknownRateOffer });
  assert.equal(result.apr.status, "rateOnly");
  assert.equal(result.apr.apr, null);
  assert.equal(result.apr.allInCost, null);
});

test("rules are configurable and the safety cap is not embedded in UI logic", () => {
  const input: AssessmentInput = { borrower: profile(), request: request(800_000, "wedding", "personalLoan"), offer };
  const baseline = assessBorrower(input);
  const stricter = assessBorrower(input, {
    ...DEFAULT_RULES,
    safeDebtServiceCaps: { ...DEFAULT_RULES.safeDebtServiceCaps, value: { salaried: 0.3, selfEmployed: 0.35, informal: 0.3 } }
  });
  assert.ok(stricter.affordability.recommendedMaximumEmi! < baseline.affordability.recommendedMaximumEmi!);
});
