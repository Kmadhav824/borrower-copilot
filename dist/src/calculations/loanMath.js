/** Standard reducing-balance EMI. Rate is nominal annual decimal, e.g. 0.12. */
export function calculateEmi(principal, annualRate, months) {
    if (principal < 0 || annualRate < 0 || months <= 0)
        throw new Error("Invalid loan inputs");
    if (annualRate === 0)
        return principal / months;
    const monthlyRate = annualRate / 12;
    return principal * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
}
/** Present value of a fixed monthly EMI under reducing-balance interest. */
export function principalFromEmi(emi, annualRate, months) {
    if (emi < 0 || annualRate < 0 || months <= 0)
        throw new Error("Invalid loan inputs");
    if (annualRate === 0)
        return emi * months;
    const monthlyRate = annualRate / 12;
    return emi * (1 - (1 + monthlyRate) ** -months) / monthlyRate;
}
/** Monthly IRR through bisection. Cashflows must start positive then contain repayments. */
export function monthlyIrr(cashflows) {
    if (cashflows.length < 2 || cashflows[0] === undefined || cashflows[0] <= 0 || !cashflows.slice(1).some((cashflow) => cashflow < 0))
        return null;
    const npv = (rate) => cashflows.reduce((sum, cashflow, index) => sum + cashflow / ((1 + rate) ** index), 0);
    let low = -0.999;
    let high = 1;
    while (npv(high) > 0 && high < 128)
        high *= 2;
    if (npv(low) * npv(high) > 0)
        return null;
    for (let iteration = 0; iteration < 200; iteration += 1) {
        const middle = (low + high) / 2;
        if (npv(middle) > 0)
            low = middle;
        else
            high = middle;
    }
    return (low + high) / 2;
}
export function annualiseMonthlyRate(monthlyRate) {
    return (1 + monthlyRate) ** 12 - 1;
}
