import { type EngineRules } from "../../rules/config.js";
import type { AssessmentResult, BorrowerProfile, LoanOfferInputs, LoanRequest } from "./types.js";
export interface AssessmentInput {
    readonly borrower: BorrowerProfile;
    readonly request: LoanRequest;
    readonly offer?: LoanOfferInputs;
}
export declare function assessBorrower(input: AssessmentInput, rules?: EngineRules): AssessmentResult;
