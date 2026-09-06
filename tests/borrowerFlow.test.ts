import assert from "node:assert/strict";
import test from "node:test";
import { assessBorrower } from "../src/domain/borrower/engine.js";
import {
  getNextQuestion, getVisibleQuestions, normalizeAnswers, toAssessmentInput,
  type FlowAnswers
} from "../src/application/borrowerFlow.js";
import type { LoanOfferInputs, NumericInput } from "../src/domain/borrower/types.js";

const known = (value: number): NumericInput => ({ kind: "known", value });
const unknown = (): NumericInput => ({ kind: "unknown", reason: "Not provided" });

const offer: LoanOfferInputs = {
  nominalAnnualRate: known(0.12),
  processingFee: known(6_500),
  lenderCollectedThirdPartyCharges: known(0),
  applicableKnownTaxes: known(0)
};

function coreAnswers(overrides: FlowAnswers = {}): FlowAnswers {
  return {
    incomeType: "salaried",
    purpose: "personal",
    requestedAmount: known(500_000),
    monthlyIncome: known(100_000),
    essentialMonthlyExpenses: known(30_000),
    existingEmis: known(10_000),
    upcomingMonthlyObligations: known(0),
    incomeStability: "stable",
    creditProfile: { status: "known", score: known(780) },
    loanTerms: { rateType: "fixed", preferredTenureMonths: known(60) },
    ...overrides
  };
}

function visibleIds(answers: FlowAnswers): readonly string[] {
  return getVisibleQuestions(answers).map((question) => question.id);
}

test("Priya follows the salaried path and normalizes to a valid assessment input", () => {
  const answers = coreAnswers({ purpose: "wedding" });
  const normalized = normalizeAnswers(answers);
  const input = toAssessmentInput(answers, offer);

  assert.notEqual(normalized.borrower, null);
  assert.notEqual(normalized.request, null);
  assert.equal(normalized.borrower!.incomeType, "salaried");
  assert.equal(normalized.request!.purpose, "wedding");
  assert.equal(input !== null, true);
  assert.equal(getNextQuestion(answers)?.id, "highCostDebtPresent");
  assert.equal(visibleIds(answers).includes("collateralType"), false);
  assert.equal(visibleIds(answers).includes("coApplicantMonthlyIncome"), false);
});

test("Ravi follows the self-employed business and collateral path", () => {
  const answers = coreAnswers({
    incomeType: "selfEmployed",
    purpose: "business",
    monthlyIncome: { kind: "range", low: 40_000, high: 80_000 },
    essentialMonthlyExpenses: known(10_000),
    existingEmis: known(0),
    incomeStability: "variable",
    creditProfile: { status: "noHistory", score: unknown() },
    coApplicantMonthlyIncome: known(18_000),
    collateralType: "property",
    collateralValue: known(4_500_000),
    collateralOwnershipVerified: true,
    collateralUnencumbered: true
  });
  const normalized = normalizeAnswers(answers);
  const visible = visibleIds(answers);

  assert.notEqual(normalized.borrower, null);
  assert.notEqual(normalized.request, null);
  assert.equal(normalized.borrower!.incomeType, "selfEmployed");
  assert.equal(normalized.borrower!.collateral.type, "property");
  assert.equal(normalized.borrower!.collateral.estimatedValue.kind, "known");
  assert.equal(visible.includes("coApplicantMonthlyIncome"), true);
  assert.equal(visible.includes("collateralValue"), true);
  assert.equal(visible.includes("collateralOwnershipVerified"), true);
  assert.equal(visible.includes("collateralUnencumbered"), true);
  assert.equal(visible.includes("highCostDebtPresent"), false);
});

test("Anita follows the informal debt-risk path without irrelevant collateral questions", () => {
  const answers = coreAnswers({
    incomeType: "informal",
    purpose: "vehicle",
    requestedAmount: known(150_000),
    monthlyIncome: { kind: "range", low: 26_000, high: 30_000 },
    essentialMonthlyExpenses: known(20_000),
    existingEmis: known(8_000),
    incomeStability: "variable",
    creditProfile: { status: "unknown", score: unknown() },
    highCostDebtPresent: true,
    recentBounce: true
  });
  const normalized = normalizeAnswers(answers);
  const visible = visibleIds(answers);

  assert.notEqual(normalized.borrower, null);
  assert.notEqual(normalized.request, null);
  assert.equal(normalized.borrower!.incomeType, "informal");
  assert.equal(normalized.borrower!.credit.highCostDebtPresent, true);
  assert.equal(normalized.borrower!.credit.recentBounce, true);
  assert.equal(visible.includes("highCostDebtPresent"), true);
  assert.equal(visible.includes("recentBounce"), true);
  assert.equal(visible.includes("collateralType"), false);
  assert.equal(visible.includes("collateralValue"), false);
});

test("irrelevant adaptive questions stay hidden when there is no existing debt or business collateral route", () => {
  const answers = coreAnswers({ incomeType: "salaried", purpose: "wedding", existingEmis: known(0) });
  const visible = visibleIds(answers);

  assert.equal(visible.includes("highCostDebtPresent"), false);
  assert.equal(visible.includes("recentBounce"), false);
  assert.equal(visible.includes("coApplicantMonthlyIncome"), false);
  assert.equal(visible.includes("collateralType"), false);
  assert.equal(visible.includes("collateralValue"), false);
});

test("unknown answers remain explicit unknown values during normalization", () => {
  const answers = coreAnswers({
    monthlyIncome: unknown(),
    existingEmis: unknown(),
    upcomingMonthlyObligations: unknown(),
    creditProfile: { status: "unknown", score: unknown() },
    highCostDebtPresent: "unknown",
    recentBounce: "unknown"
  });
  const normalized = normalizeAnswers(answers);

  assert.notEqual(normalized.borrower, null);
  assert.equal(normalized.borrower!.financial.monthlyIncome.kind, "unknown");
  assert.equal(normalized.borrower!.financial.existingEmis.kind, "unknown");
  assert.equal(normalized.borrower!.financial.upcomingMonthlyObligations.kind, "unknown");
  assert.equal(normalized.borrower!.credit.scoreStatus, "unknown");
  assert.equal(normalized.borrower!.credit.highCostDebtPresent, "unknown");
  assert.equal(normalized.borrower!.credit.recentBounce, "unknown");
  assert.equal(toAssessmentInput(answers, offer) !== null, true);
});

test("undecided loan terms remain unknown and still produce an assessment", () => {
  const answers = coreAnswers({
    loanTerms: { rateType: "unknown", preferredTenureMonths: unknown() }
  });
  const input = toAssessmentInput(answers, offer);

  assert.notEqual(input, null);
  assert.equal(input!.request.rateType, "unknown");
  assert.equal(input!.request.preferredTenureMonths.kind, "unknown");

  const result = assessBorrower(input!);
  assert.notEqual(result, null);
  assert.equal(result.stress.scenarios.includes("rate"), false);
  assert.equal(result.tenureOptions.length, 3);
});

test("unknown numeric core answers produce a needs-information assessment instead of failing", () => {
  const answers = coreAnswers({
    requestedAmount: unknown(),
    monthlyIncome: unknown(),
    essentialMonthlyExpenses: unknown(),
    existingEmis: unknown(),
    upcomingMonthlyObligations: unknown()
  });
  const input = toAssessmentInput(answers, offer);

  assert.notEqual(input, null);
  const result = assessBorrower(input!);
  assert.equal(result.verdict, "needsInformation");
  assert.equal(result.affordability.safeBorrowing, null);
  assert.equal(result.eligibility.likelySanction, null);
  assert.equal(result.stress.passes, null);
});

test("unknown income type and purpose remain blocked as routing information", () => {
  const unknownIncome = toAssessmentInput(coreAnswers({ incomeType: "unknown" }), offer);
  const unknownPurpose = toAssessmentInput(coreAnswers({ purpose: "unknown" }), offer);

  assert.equal(unknownIncome, null);
  assert.equal(unknownPurpose, null);
  assert.equal(normalizeAnswers(coreAnswers({ incomeType: "unknown" })).borrower, null);
  assert.equal(normalizeAnswers(coreAnswers({ purpose: "unknown" })).request, null);
});

test("high-cost debt answer changes the fair-rate assessment", () => {
  const withoutHighCostDebt = toAssessmentInput(coreAnswers({ highCostDebtPresent: false, recentBounce: false }), offer)!;
  const withHighCostDebt = toAssessmentInput(coreAnswers({ highCostDebtPresent: true, recentBounce: false }), offer)!;
  const baseline = assessBorrower(withoutHighCostDebt);
  const changed = assessBorrower(withHighCostDebt);

  assert.notEqual(baseline.fairRate.profile, "stressed");
  assert.equal(changed.fairRate.profile, "stressed");
});

test("verified collateral answer changes the routed product and sanction path", () => {
  const unsecuredAnswers = coreAnswers({ incomeType: "selfEmployed", purpose: "business", existingEmis: known(0), collateralType: "none" });
  const securedAnswers = coreAnswers({
    incomeType: "selfEmployed", purpose: "business", existingEmis: known(0), collateralType: "property",
    collateralValue: known(4_500_000), collateralOwnershipVerified: true, collateralUnencumbered: true
  });
  const unsecured = assessBorrower(toAssessmentInput(unsecuredAnswers, offer)!);
  const secured = assessBorrower(toAssessmentInput(securedAnswers, offer)!);

  assert.equal(unsecured.eligibility.productRoute, "businessLoan");
  assert.equal(secured.eligibility.productRoute, "loanAgainstProperty");
  assert.ok(secured.reasons.some((item) => item.id === "SECURED_ROUTE_CAP"));
});
