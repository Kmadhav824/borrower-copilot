import { toRange } from "../calculations/inputs.js";
import type { AssessmentInput } from "../domain/borrower/engine.js";
import type {
  BorrowerProfile, CreditScoreStatus, IncomeType, LoanOfferInputs, LoanRequest, NumericInput, ProductType, RateType
} from "../domain/borrower/types.js";

export type QuestionId =
  | "incomeType"
  | "purpose"
  | "requestedAmount"
  | "monthlyIncome"
  | "essentialMonthlyExpenses"
  | "existingEmis"
  | "upcomingMonthlyObligations"
  | "incomeStability"
  | "creditProfile"
  | "loanTerms"
  | "coApplicantMonthlyIncome"
  | "highCostDebtPresent"
  | "recentBounce"
  | "collateralType"
  | "collateralValue"
  | "collateralOwnershipVerified"
  | "collateralUnencumbered"
  | "offerAvailable"
  | "nominalAnnualRate"
  | "processingFee"
  | "lenderCollectedThirdPartyCharges"
  | "applicableKnownTaxes";

export type FlowAnswer =
  | NumericInput
  | IncomeType
  | "stable"
  | "variable"
  | "property"
  | "gold"
  | "none"
  | "yes"
  | "no"
  | "unknown"
  | LoanRequest["purpose"]
  | CreditScoreAnswer
  | LoanTermsAnswer
  | boolean;

export interface CreditScoreAnswer {
  readonly status: CreditScoreStatus;
  readonly score: NumericInput;
}

export interface LoanTermsAnswer {
  readonly rateType: RateType | "unknown";
  readonly preferredTenureMonths: NumericInput;
}

export type FlowAnswers = Partial<Record<QuestionId, FlowAnswer>>;

export type QuestionInputType = "select" | "money" | "range" | "percentage" | "boolean" | "composite";
export type QuestionRequiredness = "core" | "adaptive";
export type FlowImpact = "routing" | "eligibility" | "affordability" | "rate" | "emi" | "stress" | "verdict" | "confidence" | "apr" | "negotiationCard";

export interface QuestionOption {
  readonly value: FlowAnswer;
  readonly label: string;
}

export interface QuestionDefinition {
  readonly id: QuestionId;
  readonly text: string;
  readonly inputType: QuestionInputType;
  readonly requiredness: QuestionRequiredness;
  readonly options?: readonly QuestionOption[];
  readonly visibleWhen: (answers: FlowAnswers) => boolean;
  readonly targetFields: readonly string[];
  readonly impacts: readonly FlowImpact[];
  readonly whyWeAsk: string;
}

const answered = (answers: FlowAnswers, id: QuestionId): boolean => answers[id] !== undefined;

function knownOrUnknown(value: FlowAnswer | undefined): NumericInput {
  if (value === undefined) return { kind: "unknown", reason: "Not provided" };
  if (typeof value === "object" && value !== null && "kind" in value) return value as NumericInput;
  throw new Error("Expected a numeric answer");
}

function debtIsRelevant(answers: FlowAnswers): boolean {
  const existing = answers.existingEmis;
  if (existing === undefined) return false;
  if (typeof existing !== "object" || existing === null || !("kind" in existing)) return false;
  if (existing.kind === "unknown") return true;
  const range = toRange(existing as NumericInput);
  return range !== null && range.high > 0;
}

function businessCollateralIsRelevant(answers: FlowAnswers): boolean {
  return answers.incomeType === "selfEmployed" && answers.purpose === "business";
}

function collateralDetailsAreRelevant(answers: FlowAnswers): boolean {
  return businessCollateralIsRelevant(answers) && (answers.collateralType === "property" || answers.collateralType === "gold");
}

function offerIsAvailable(answers: FlowAnswers): boolean {
  return answers.offerAvailable === "yes";
}

const coreVisible = (): boolean => true;

export const QUESTION_DEFINITIONS: readonly QuestionDefinition[] = [
  {
    id: "incomeType", text: "How do you earn most of your income?", inputType: "select", requiredness: "core",
    options: [{ value: "salaried", label: "Salaried" }, { value: "selfEmployed", label: "Self-employed or business" }, { value: "informal", label: "Variable or informal income" }, { value: "unknown", label: "I am not sure" }],
    visibleWhen: coreVisible, targetFields: ["borrower.incomeType"], impacts: ["routing", "eligibility", "affordability", "rate", "stress", "confidence"],
    whyWeAsk: "Income pattern changes how much income can be relied on and which lending route may fit."
  },
  {
    id: "purpose", text: "What is the loan for?", inputType: "select", requiredness: "core",
    options: [{ value: "personal", label: "Personal need" }, { value: "wedding", label: "Wedding" }, { value: "business", label: "Business" }, { value: "vehicle", label: "Vehicle" }, { value: "emergency", label: "Emergency" }, { value: "other", label: "Something else" }, { value: "unknown", label: "I am not sure" }],
    visibleWhen: coreVisible, targetFields: ["request.purpose"], impacts: ["routing", "eligibility", "rate", "negotiationCard"],
    whyWeAsk: "Purpose helps identify a more suitable product route instead of assuming an unsecured personal loan."
  },
  {
    id: "requestedAmount", text: "How much do you want to borrow?", inputType: "money", requiredness: "core",
    visibleWhen: coreVisible, targetFields: ["request.requestedAmount"], impacts: ["verdict", "apr", "negotiationCard"],
    whyWeAsk: "The requested amount is compared with both likely lender sanction and safe borrowing."
  },
  {
    id: "monthlyIncome", text: "What is your usual monthly income?", inputType: "range", requiredness: "core",
    visibleWhen: coreVisible, targetFields: ["borrower.financial.monthlyIncome"], impacts: ["eligibility", "affordability", "emi", "stress", "confidence"],
    whyWeAsk: "Income drives both the lender estimate and the conservative borrower-safe limit."
  },
  {
    id: "essentialMonthlyExpenses", text: "How much do essential household expenses cost each month?", inputType: "range", requiredness: "core",
    visibleWhen: coreVisible, targetFields: ["borrower.financial.essentialMonthlyExpenses"], impacts: ["affordability", "emi", "stress", "confidence"],
    whyWeAsk: "Essential spending must be protected before a new EMI is considered safe."
  },
  {
    id: "existingEmis", text: "How much do you currently pay toward loans each month?", inputType: "range", requiredness: "core",
    visibleWhen: coreVisible, targetFields: ["borrower.financial.existingEmis"], impacts: ["eligibility", "affordability", "emi", "stress", "verdict", "confidence"],
    whyWeAsk: "Existing EMIs reduce the room available for another repayment."
  },
  {
    id: "upcomingMonthlyObligations", text: "Do you have other known monthly commitments starting soon?", inputType: "range", requiredness: "core",
    visibleWhen: coreVisible, targetFields: ["borrower.financial.upcomingMonthlyObligations"], impacts: ["affordability", "emi", "stress", "verdict"],
    whyWeAsk: "Known upcoming commitments can reduce the safe EMI ceiling; unknown is kept unknown."
  },
  {
    id: "incomeStability", text: "How stable is that income month to month?", inputType: "select", requiredness: "core",
    options: [{ value: "stable", label: "Mostly stable" }, { value: "variable", label: "Variable" }, { value: "unknown", label: "I am not sure" }],
    visibleWhen: coreVisible, targetFields: ["borrower.incomeStability"], impacts: ["rate", "stress", "confidence"],
    whyWeAsk: "Income stability affects the rate band and the stress scenario."
  },
  {
    id: "creditProfile", text: "Which best describes your credit history?", inputType: "composite", requiredness: "core",
    options: [{ value: { status: "known", score: { kind: "unknown", reason: "Score not provided" } }, label: "I know my score" }, { value: { status: "noHistory", score: { kind: "unknown", reason: "No credit history" } }, label: "I have no known credit history" }, { value: { status: "unknown", score: { kind: "unknown", reason: "Not provided" } }, label: "I do not know" }],
    visibleWhen: coreVisible, targetFields: ["borrower.credit.scoreStatus", "borrower.credit.score"], impacts: ["rate", "confidence", "negotiationCard"],
    whyWeAsk: "Credit evidence changes the fair-rate range; missing information widens uncertainty rather than becoming a poor score."
  },
  {
    id: "loanTerms", text: "What repayment term and rate type are you considering?", inputType: "composite", requiredness: "core",
    options: [{ value: { rateType: "fixed", preferredTenureMonths: { kind: "known", value: 36 } }, label: "Fixed rate, 3 years" }, { value: { rateType: "fixed", preferredTenureMonths: { kind: "known", value: 60 } }, label: "Fixed rate, 5 years" }, { value: { rateType: "floating", preferredTenureMonths: { kind: "known", value: 60 } }, label: "Floating rate, 5 years" }, { value: { rateType: "unknown", preferredTenureMonths: { kind: "unknown", reason: "Not decided" } }, label: "I have not decided" }],
    visibleWhen: coreVisible, targetFields: ["request.rateType", "request.preferredTenureMonths"], impacts: ["emi", "stress", "apr", "negotiationCard"],
    whyWeAsk: "Tenure changes EMI and total repayment, while floating rates need an additional stress case."
  },
  {
    id: "coApplicantMonthlyIncome", text: "Will another applicant contribute regular monthly income?", inputType: "range", requiredness: "adaptive",
    visibleWhen: (answers) => answers.incomeType === "selfEmployed",
    targetFields: ["borrower.financial.coApplicantMonthlyIncome"], impacts: ["eligibility", "affordability", "emi", "stress", "negotiationCard"],
    whyWeAsk: "A known co-applicant income range can change the estimated repayment capacity."
  },
  {
    id: "highCostDebtPresent", text: "Do any existing loans or app loans have a high interest rate?", inputType: "boolean", requiredness: "adaptive",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "unknown", label: "I do not know" }],
    visibleWhen: debtIsRelevant, targetFields: ["borrower.credit.highCostDebtPresent"], impacts: ["rate", "verdict", "negotiationCard"],
    whyWeAsk: "High-cost debt can make adding new borrowing unsafe and changes the rate-risk assessment."
  },
  {
    id: "recentBounce", text: "Have you missed or bounced a loan repayment recently?", inputType: "boolean", requiredness: "adaptive",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "unknown", label: "I do not know" }],
    visibleWhen: (answers) => debtIsRelevant(answers) || answers.highCostDebtPresent === true,
    targetFields: ["borrower.credit.recentBounce"], impacts: ["rate", "verdict", "negotiationCard"],
    whyWeAsk: "A recent repayment problem is an important warning signal and should not be hidden in a lender estimate."
  },
  {
    id: "collateralType", text: "Do you have collateral that could support a secured business loan?", inputType: "select", requiredness: "adaptive",
    options: [{ value: "property", label: "Property" }, { value: "gold", label: "Gold" }, { value: "none", label: "No collateral" }, { value: "unknown", label: "I am not sure" }],
    visibleWhen: businessCollateralIsRelevant, targetFields: ["borrower.collateral.type"], impacts: ["routing", "eligibility", "rate", "negotiationCard"],
    whyWeAsk: "Verified collateral can change the recommended product route and cap the likely sanction estimate."
  },
  {
    id: "collateralValue", text: "What is the approximate current value of that collateral?", inputType: "range", requiredness: "adaptive",
    visibleWhen: collateralDetailsAreRelevant, targetFields: ["borrower.collateral.estimatedValue"], impacts: ["eligibility", "negotiationCard"],
    whyWeAsk: "A secured-route estimate is constrained by the collateral value as well as repayment capacity."
  },
  {
    id: "collateralOwnershipVerified", text: "Is ownership of the collateral documented and verifiable?", inputType: "boolean", requiredness: "adaptive",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "unknown", label: "I do not know" }],
    visibleWhen: collateralDetailsAreRelevant, targetFields: ["borrower.collateral.ownershipVerified"], impacts: ["routing", "eligibility", "confidence"],
    whyWeAsk: "Unverified ownership prevents the model from treating collateral as available security."
  },
  {
    id: "collateralUnencumbered", text: "Is the collateral free from another loan or legal charge?", inputType: "boolean", requiredness: "adaptive",
    options: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "unknown", label: "I do not know" }],
    visibleWhen: collateralDetailsAreRelevant, targetFields: ["borrower.collateral.unencumbered"], impacts: ["routing", "eligibility", "confidence"],
    whyWeAsk: "A secured route requires the collateral to be available and unencumbered."
  },
  {
    id: "offerAvailable", text: "Do you already have a lender offer to compare?", inputType: "select", requiredness: "adaptive",
    options: [{ value: "yes", label: "Yes, I have offer details" }, { value: "no", label: "No offer yet" }, { value: "unknown", label: "I am not sure" }],
    visibleWhen: coreVisible, targetFields: ["offer"], impacts: ["apr", "confidence", "negotiationCard"],
    whyWeAsk: "A lender's actual fees and rate are needed to estimate all-in APR; without them, we show a rate-only view."
  },
  {
    id: "nominalAnnualRate", text: "What annual interest rate did the lender offer?", inputType: "percentage", requiredness: "adaptive",
    visibleWhen: offerIsAvailable, targetFields: ["offer.nominalAnnualRate"], impacts: ["apr", "negotiationCard"],
    whyWeAsk: "The offered rate lets us compare the lender's quote with the modelled fair-rate range."
  },
  {
    id: "processingFee", text: "What processing fee is shown in the offer?", inputType: "money", requiredness: "adaptive",
    visibleWhen: offerIsAvailable, targetFields: ["offer.processingFee"], impacts: ["apr", "confidence", "negotiationCard"],
    whyWeAsk: "Upfront fees reduce net disbursal and can increase the all-in APR."
  },
  {
    id: "lenderCollectedThirdPartyCharges", text: "What lender-collected third-party charges are listed?", inputType: "money", requiredness: "adaptive",
    visibleWhen: offerIsAvailable, targetFields: ["offer.lenderCollectedThirdPartyCharges"], impacts: ["apr", "confidence", "negotiationCard"],
    whyWeAsk: "Known lender-collected charges belong in the all-in cost comparison."
  },
  {
    id: "applicableKnownTaxes", text: "What applicable taxes or statutory charges are listed?", inputType: "money", requiredness: "adaptive",
    visibleWhen: offerIsAvailable, targetFields: ["offer.applicableKnownTaxes"], impacts: ["apr", "confidence", "negotiationCard"],
    whyWeAsk: "Known taxes and statutory charges affect the amount actually disbursed."
  }
];

export function getVisibleQuestions(answers: FlowAnswers): readonly QuestionDefinition[] {
  return QUESTION_DEFINITIONS.filter((question) => question.visibleWhen(answers));
}

export function getNextQuestion(answers: FlowAnswers): QuestionDefinition | null {
  return getVisibleQuestions(answers).find((question) => !answered(answers, question.id)) ?? null;
}

export interface NormalizedBorrowerInput {
  readonly borrower: BorrowerProfile | null;
  readonly request: LoanRequest | null;
  readonly offer: LoanOfferInputs | null;
  readonly missingCore: readonly QuestionId[];
}

export function normalizeAnswers(answers: FlowAnswers): NormalizedBorrowerInput {
  const missingCore = QUESTION_DEFINITIONS
    .filter((question) => question.requiredness === "core" && !answered(answers, question.id))
    .map((question) => question.id);
  const incomeType = answers.incomeType;
  const purpose = answers.purpose;
  const terms = answers.loanTerms;
  const resolvedTerms = resolveLoanTerms(terms);
  const borrower = incomeType && incomeType !== "unknown" && (incomeType === "salaried" || incomeType === "selfEmployed" || incomeType === "informal")
    ? createBorrowerProfile(answers, incomeType)
    : null;
  const request = isLoanPurpose(purpose) && resolvedTerms
    ? createLoanRequest(answers, purpose, resolvedTerms)
    : null;
  return { borrower, request, offer: createLoanOffer(answers), missingCore };
}

export function toAssessmentInput(answers: FlowAnswers, offer?: AssessmentInput["offer"]): AssessmentInput | null {
  const normalized = normalizeAnswers(answers);
  if (!normalized.borrower || !normalized.request) return null;
  const normalizedOffer = normalized.offer ?? offer;
  return { borrower: normalized.borrower, request: normalized.request, ...(normalizedOffer ? { offer: normalizedOffer } : {}) };
}

function isNumericInput(value: FlowAnswer | undefined): value is NumericInput {
  return typeof value === "object" && value !== null && "kind" in value;
}

function isCreditScoreAnswer(value: FlowAnswer | undefined): value is CreditScoreAnswer {
  return typeof value === "object" && value !== null && "status" in value && "score" in value;
}

function isLoanTermsAnswer(value: FlowAnswer | undefined): value is LoanTermsAnswer {
  return typeof value === "object" && value !== null && "rateType" in value && "preferredTenureMonths" in value;
}

function isLoanPurpose(value: FlowAnswer | undefined): value is LoanRequest["purpose"] {
  return value === "personal" || value === "wedding" || value === "business" || value === "vehicle" || value === "emergency" || value === "other";
}

function isOfferAvailability(value: FlowAnswer | undefined): value is "yes" | "no" | "unknown" {
  return value === "yes" || value === "no" || value === "unknown";
}

function resolveLoanTerms(value: FlowAnswer | undefined): LoanTermsAnswer | null {
  if (!isLoanTermsAnswer(value)) return null;
  return value;
}

function createBorrowerProfile(answers: FlowAnswers, incomeType: IncomeType): BorrowerProfile {
  const credit = isCreditScoreAnswer(answers.creditProfile) ? answers.creditProfile : { status: "unknown" as const, score: { kind: "unknown" as const, reason: "Not provided" } };
  const collateralType = answers.collateralType === "property" || answers.collateralType === "gold" || answers.collateralType === "none" ? answers.collateralType : "unknown";
  return {
    age: { kind: "unknown", reason: "Not collected by the assessment flow" },
    incomeType,
    employmentOrBusinessTenureMonths: { kind: "unknown", reason: "Not collected by the assessment flow" },
    incomeStability: answers.incomeStability === "stable" || answers.incomeStability === "variable" ? answers.incomeStability : "unknown",
    dependants: { kind: "unknown", reason: "Not collected by the assessment flow" },
    financial: {
      monthlyIncome: knownOrUnknown(answers.monthlyIncome),
      documentedMonthlyIncome: { kind: "unknown", reason: "Not collected by the assessment flow" },
      existingEmis: knownOrUnknown(answers.existingEmis),
      essentialMonthlyExpenses: knownOrUnknown(answers.essentialMonthlyExpenses),
      emergencySavingsMonths: { kind: "unknown", reason: "Not collected by the assessment flow" },
      upcomingMonthlyObligations: knownOrUnknown(answers.upcomingMonthlyObligations),
      coApplicantMonthlyIncome: knownOrUnknown(answers.coApplicantMonthlyIncome)
    },
    credit: {
      scoreStatus: credit.status,
      score: credit.score,
      recentBounce: answers.recentBounce === true || answers.recentBounce === false ? answers.recentBounce : "unknown",
      highCostDebtPresent: answers.highCostDebtPresent === true || answers.highCostDebtPresent === false ? answers.highCostDebtPresent : "unknown"
    },
    collateral: {
      type: collateralType,
      estimatedValue: knownOrUnknown(answers.collateralValue),
      ownershipVerified: answers.collateralOwnershipVerified === true || answers.collateralOwnershipVerified === false ? answers.collateralOwnershipVerified : "unknown",
      unencumbered: answers.collateralUnencumbered === true || answers.collateralUnencumbered === false ? answers.collateralUnencumbered : "unknown"
    }
  };
}

function createLoanRequest(answers: FlowAnswers, purpose: LoanRequest["purpose"], terms: LoanTermsAnswer): LoanRequest {
  return {
    requestedAmount: knownOrUnknown(answers.requestedAmount),
    purpose,
    productIntent: "unsure",
    preferredTenureMonths: terms.preferredTenureMonths,
    rateType: terms.rateType
  };
}

function createLoanOffer(answers: FlowAnswers): LoanOfferInputs | null {
  if (!isOfferAvailability(answers.offerAvailable) || answers.offerAvailable !== "yes") return null;
  return {
    nominalAnnualRate: knownOrUnknown(answers.nominalAnnualRate),
    processingFee: knownOrUnknown(answers.processingFee),
    lenderCollectedThirdPartyCharges: knownOrUnknown(answers.lenderCollectedThirdPartyCharges),
    applicableKnownTaxes: knownOrUnknown(answers.applicableKnownTaxes)
  };
}