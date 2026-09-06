import type { BorrowerProfile, LoanRequest, ProductType } from "../domain/borrower/types.js";
/** Product routing is deliberately limited to the assignment's required use cases. */
export declare function routeProduct(profile: BorrowerProfile, request: LoanRequest): ProductType;
