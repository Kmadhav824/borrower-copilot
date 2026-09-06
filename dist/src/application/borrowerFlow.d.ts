import type { AssessmentInput } from "../domain/borrower/engine.js";
import type { BorrowerProfile, CreditScoreStatus, IncomeType, LoanRequest, NumericInput, RateType } from "../domain/borrower/types.js";
export type QuestionId = "incomeType" | "purpose" | "requestedAmount" | "monthlyIncome" | "essentialMonthlyExpenses" | "existingEmis" | "upcomingMonthlyObligations" | "incomeStability" | "creditProfile" | "loanTerms" | "coApplicantMonthlyIncome" | "highCostDebtPresent" | "recentBounce" | "collateralType" | "collateralValue" | "collateralOwnershipVerified" | "collateralUnencumbered";
export type FlowAnswer = NumericInput | IncomeType | "stable" | "variable" | "property" | "gold" | "none" | "unknown" | LoanRequest["purpose"] | CreditScoreAnswer | LoanTermsAnswer | boolean;
export interface CreditScoreAnswer {
    readonly status: CreditScoreStatus;
    readonly score: NumericInput;
}
export interface LoanTermsAnswer {
    readonly rateType: RateType | "unknown";
    readonly preferredTenureMonths: NumericInput;
}
export type FlowAnswers = Partial<Record<QuestionId, FlowAnswer>>;
export type QuestionInputType = "select" | "money" | "range" | "boolean" | "composite";
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
export declare const QUESTION_DEFINITIONS: readonly QuestionDefinition[];
export declare function getVisibleQuestions(answers: FlowAnswers): readonly QuestionDefinition[];
export declare function getNextQuestion(answers: FlowAnswers): QuestionDefinition | null;
export interface NormalizedBorrowerInput {
    readonly borrower: BorrowerProfile | null;
    readonly request: LoanRequest | null;
    readonly missingCore: readonly QuestionId[];
}
export declare function normalizeAnswers(answers: FlowAnswers): NormalizedBorrowerInput;
export declare function toAssessmentInput(answers: FlowAnswers, offer?: AssessmentInput["offer"]): AssessmentInput | null;
