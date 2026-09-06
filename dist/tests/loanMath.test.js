import assert from "node:assert/strict";
import test from "node:test";
import { annualiseMonthlyRate, calculateEmi, monthlyIrr, principalFromEmi } from "../src/calculations/loanMath.js";
test("EMI and present-value calculations are inverse operations", () => {
    const emi = calculateEmi(800_000, 0.12, 36);
    const recoveredPrincipal = principalFromEmi(emi, 0.12, 36);
    assert.ok(Math.abs(recoveredPrincipal - 800_000) < 0.01);
});
test("APR IRR exceeds nominal rate when an upfront fee reduces disbursal", () => {
    const principal = 100_000;
    const emi = calculateEmi(principal, 0.12, 12);
    const irr = monthlyIrr([98_000, ...Array.from({ length: 12 }, () => -emi)]);
    assert.notEqual(irr, null);
    assert.ok(annualiseMonthlyRate(irr) > 0.12);
});
test("invalid cashflow has no IRR", () => {
    assert.equal(monthlyIrr([-100, 20, 20]), null);
});
