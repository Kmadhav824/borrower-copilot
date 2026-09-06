/** Standard reducing-balance EMI. Rate is nominal annual decimal, e.g. 0.12. */
export declare function calculateEmi(principal: number, annualRate: number, months: number): number;
/** Present value of a fixed monthly EMI under reducing-balance interest. */
export declare function principalFromEmi(emi: number, annualRate: number, months: number): number;
/** Monthly IRR through bisection. Cashflows must start positive then contain repayments. */
export declare function monthlyIrr(cashflows: readonly number[]): number | null;
export declare function annualiseMonthlyRate(monthlyRate: number): number;
