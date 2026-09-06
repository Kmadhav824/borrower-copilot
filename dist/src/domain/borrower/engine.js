import { annualiseMonthlyRate, calculateEmi, monthlyIrr, principalFromEmi } from "../../calculations/loanMath.js";
import { range, toRange } from "../../calculations/inputs.js";
import { reason } from "../../explanations/reasons.js";
import { routeProduct } from "../../products/productCatalog.js";
import { DEFAULT_RULES } from "../../rules/config.js";
const INR = (value) => ({ ...value, currency: "INR" });
const hasKnownTrue = (value) => value === true;
function stableIncome(profile, financial, rules) {
    const income = toRange(financial.monthlyIncome);
    if (!income)
        return null;
    const [lowRecognition, highRecognition] = rules.incomeRecognition.value[profile.incomeType];
    let low = income.low * lowRecognition;
    let high = income.high * highRecognition;
    const coApplicant = toRange(financial.coApplicantMonthlyIncome);
    if (coApplicant) {
        low += coApplicant.low * lowRecognition;
        high += coApplicant.high * highRecognition;
    }
    return range(low, high);
}
function profileQuality(profile) {
    const adverse = hasKnownTrue(profile.credit.recentBounce) || hasKnownTrue(profile.credit.highCostDebtPresent);
    if (adverse)
        return "stressed";
    const score = toRange(profile.credit.score);
    const stableAndDocumented = profile.incomeStability === "stable" && profile.financial.documentedMonthlyIncome.kind !== "unknown";
    if (profile.credit.scoreStatus === "known" && score && score.low >= 750 && stableAndDocumented)
        return "strong";
    if (profile.credit.scoreStatus === "unknown" || profile.credit.scoreStatus === "noHistory" || profile.incomeStability === "unknown")
        return "limited";
    return "standard";
}
function calculateFairRate(product, profile, rules) {
    const quality = profileQuality(profile);
    const market = rules.productRateBands.value[product];
    const configured = rules.profileRateBands.value[product][quality];
    const low = Math.max(market[0], configured[0]);
    const high = Math.min(market[1], configured[1]);
    const reasons = [reason("RATE_PROFILE_BAND", "rate", quality === "stressed" ? "caution" : "info", rules.profileRateBands.id, `The fair-rate band reflects a ${quality} evidence and repayment profile.`, ["credit", "incomeStability", "repaymentHistory"])];
    if (profile.credit.scoreStatus !== "known")
        reasons.push(reason("RATE_UNKNOWN_CREDIT", "rate", "caution", "UNKNOWN_CREDIT_WIDENS_RANGE", "Your rate range remains broad because credit-score information is unknown or unavailable; it is not treated as a poor score.", ["credit.score"]));
    return { band: { low, high, product, profile: quality, sourceType: rules.profileRateBands.sourceType }, reasons };
}
function affordability(profile, request, rate, product, rules) {
    const income = stableIncome(profile, profile.financial, rules);
    const expenses = toRange(profile.financial.essentialMonthlyExpenses);
    const existing = toRange(profile.financial.existingEmis);
    const upcoming = toRange(profile.financial.upcomingMonthlyObligations);
    const reasons = [];
    if (!income || !expenses || !existing) {
        if (!income)
            reasons.push(reason("SAFE_INCOME_UNKNOWN", "affordability", "blocking", "SAFE_DEBT_SERVICE_CAP", "A safe borrowing amount cannot be calculated until monthly income is provided.", ["financial.monthlyIncome"]));
        if (!expenses)
            reasons.push(reason("SAFE_EXPENSES_UNKNOWN", "affordability", "caution", "SAFE_DEBT_SERVICE_CAP", "Household expenses are unknown, so the safe borrowing amount cannot be narrowed.", ["financial.essentialMonthlyExpenses"]));
        if (!existing)
            reasons.push(reason("SAFE_EXISTING_EMIS_UNKNOWN", "affordability", "caution", "SAFE_DEBT_SERVICE_CAP", "Existing EMI commitments are unknown and are not assumed to be zero.", ["financial.existingEmis"]));
        return { result: { safeBorrowing: null, safeEmi: null, recommendedMaximumEmi: null, reasons }, reasons };
    }
    const cap = rules.safeDebtServiceCaps.value[profile.incomeType];
    const bufferPercent = rules.retainedBufferPercent.value[profile.incomeType];
    const upcomingRange = upcoming ?? range(0, 0);
    const safeEmiLow = Math.max(0, Math.min(income.low * cap - existing.high, income.low - expenses.high - existing.high - income.low * bufferPercent - upcomingRange.high));
    const safeEmiHigh = Math.max(0, Math.min(income.high * cap - existing.low, income.high - expenses.low - existing.low - income.high * bufferPercent - upcomingRange.low));
    const tenure = selectedTenure(request, product, rules);
    const safeBorrowing = INR(range(principalFromEmi(safeEmiLow, rate.high, tenure), principalFromEmi(safeEmiHigh, rate.low, tenure)));
    const safeEmi = INR(range(safeEmiLow, safeEmiHigh));
    reasons.push(reason("SAFE_EMI_EXPLAINED", "emi", safeEmiLow === 0 ? "blocking" : "info", rules.safeDebtServiceCaps.id, `Your conservative new-EMI ceiling is based on stable income, essential expenses, existing EMIs, and a retained monthly buffer.`, ["financial.monthlyIncome", "financial.essentialMonthlyExpenses", "financial.existingEmis"]));
    return { result: { safeBorrowing, safeEmi, recommendedMaximumEmi: safeEmiLow, reasons }, reasons };
}
function eligibility(profile, request, rate, product, rules) {
    const income = stableIncome(profile, profile.financial, rules);
    const existing = toRange(profile.financial.existingEmis);
    const reasons = [];
    if (!income || !existing) {
        reasons.push(reason("SANCTION_INPUTS_UNKNOWN", "eligibility", "caution", rules.lenderDebtServiceCaps.id, "A lender-sanction estimate needs income and existing-EMI information; unknown values are not assumed to be zero.", ["financial.monthlyIncome", "financial.existingEmis"]));
        return { likelySanction: null, lenderEmiCapacity: null, productRoute: product, reasons };
    }
    const [capLow, capHigh] = rules.lenderDebtServiceCaps.value[profile.incomeType];
    const lenderEmi = range(Math.max(0, income.low * capLow - existing.high), Math.max(0, income.high * capHigh - existing.low));
    const tenure = selectedTenure(request, product, rules);
    let sanction = range(principalFromEmi(lenderEmi.low, rate.high, tenure), principalFromEmi(lenderEmi.high, rate.low, tenure));
    const collateral = profile.collateral;
    const collateralValue = toRange(collateral.estimatedValue);
    if (product === "loanAgainstProperty" || product === "goldLoan") {
        if (collateralValue && collateral.ownershipVerified === true && collateral.unencumbered === true) {
            const [ltvLow, ltvHigh] = rules.collateralLtv.value;
            const collateralCap = range(collateralValue.low * ltvLow, collateralValue.high * ltvHigh);
            sanction = range(Math.min(sanction.low, collateralCap.low), Math.min(sanction.high, collateralCap.high));
            reasons.push(reason("SECURED_ROUTE_CAP", "eligibility", "info", rules.collateralLtv.id, "The secured-route estimate is capped by both repayment capacity and verified collateral value.", ["collateral.estimatedValue"]));
        }
        else {
            reasons.push(reason("SECURED_ROUTE_UNVERIFIED", "eligibility", "caution", rules.collateralLtv.id, "Collateral may support a secured route, but its ownership, encumbrance, or value is not verified.", ["collateral"]));
        }
    }
    reasons.push(reason("SANCTION_ESTIMATE", "eligibility", "info", rules.lenderDebtServiceCaps.id, "This is an estimated lender-sanction range, not approval and not a recommendation to borrow the full amount.", ["financial.monthlyIncome", "financial.existingEmis"]));
    return { likelySanction: INR(sanction), lenderEmiCapacity: INR(lenderEmi), productRoute: product, reasons };
}
function calculateApr(request, offer, rate, product, rules) {
    const amount = toRange(request.requestedAmount);
    if (!amount)
        return { status: "unavailable", apr: null, totalRepayment: null, allInCost: null, netDisbursed: null, reasons: [reason("APR_AMOUNT_UNKNOWN", "apr", "caution", "APR_IRR", "APR cannot be estimated until the loan amount is known.", ["request.requestedAmount"])] };
    const tenure = selectedTenure(request, product, rules);
    const feeInputs = offer ? [offer.processingFee, offer.lenderCollectedThirdPartyCharges, offer.applicableKnownTaxes] : [];
    if (!offer || feeInputs.some((fee) => fee.kind === "unknown")) {
        return { status: "rateOnly", apr: null, totalRepayment: INR(range(calculateEmi(amount.low, rate.high, tenure) * tenure, calculateEmi(amount.high, rate.low, tenure) * tenure)), allInCost: null, netDisbursed: null, reasons: [reason("APR_FEES_UNKNOWN", "apr", "caution", "APR_IRR", "This is a rate-only cost view. Full APR needs mandatory fee and lender-collected charge information.", ["offer.processingFee", "offer.thirdPartyCharges"])] };
    }
    const fees = feeInputs.map(toRange);
    const offeredRate = toRange(offer.nominalAnnualRate);
    const feeLow = fees.reduce((sum, fee) => sum + fee.low, 0);
    const feeHigh = fees.reduce((sum, fee) => sum + fee.high, 0);
    const scenarios = [
        { principal: amount.low, rate: offeredRate?.low ?? rate.low, fees: feeLow },
        { principal: amount.high, rate: offeredRate?.high ?? rate.high, fees: feeHigh }
    ];
    const aprs = [];
    const repayments = [];
    const costs = [];
    const disbursed = [];
    for (const scenario of scenarios) {
        const emi = calculateEmi(scenario.principal, scenario.rate, tenure);
        const net = scenario.principal - scenario.fees;
        const irr = net > 0 ? monthlyIrr([net, ...Array.from({ length: tenure }, () => -emi)]) : null;
        if (irr === null)
            return { status: "unavailable", apr: null, totalRepayment: null, allInCost: null, netDisbursed: null, reasons: [reason("APR_INVALID_CASHFLOW", "apr", "blocking", "APR_IRR", "APR could not be calculated because known fees exceed or invalidate net disbursal.", ["offer"])] };
        aprs.push(annualiseMonthlyRate(irr));
        repayments.push(emi * tenure);
        costs.push(emi * tenure - net);
        disbursed.push(net);
    }
    return { status: "estimated", apr: range(aprs[0], aprs[1]), totalRepayment: INR(range(repayments[0], repayments[1])), allInCost: INR(range(costs[0], costs[1])), netDisbursed: INR(range(disbursed[0], disbursed[1])), reasons: [reason("APR_IRR", "apr", "info", "APR_IRR", "APR is estimated from net disbursal and scheduled repayments, including known mandatory fees.", ["request.requestedAmount", "offer"])] };
}
function stressTest(profile, request, rate, product, safeEmi, rules) {
    const income = stableIncome(profile, profile.financial, rules);
    const expenses = toRange(profile.financial.essentialMonthlyExpenses);
    const existing = toRange(profile.financial.existingEmis);
    if (!income || !expenses || !existing || safeEmi === null)
        return { passes: null, stressedMonthlySurplus: null, scenarios: [], reasons: [reason("STRESS_INPUTS_UNKNOWN", "stress", "caution", "STRESS_TEST", "Stress affordability needs income, expenses, existing EMIs, and a safe EMI estimate.", ["financial"])] };
    const incomeShock = rules.incomeShock.value[profile.incomeType];
    const stressedIncome = income.low * (1 - incomeShock);
    const stressedExpenses = expenses.high * (1 + rules.expenseShock.value);
    const rateShock = request.rateType === "floating" ? rules.floatingRateShock.value : 0;
    const tenure = selectedTenure(request, product, rules);
    const principal = principalFromEmi(safeEmi, rate.high, tenure);
    const stressedEmi = calculateEmi(principal, rate.high + rateShock, tenure);
    const surplus = stressedIncome - stressedExpenses - existing.high - stressedEmi;
    const minimum = Math.max(rules.minimumPostStressSurplus.value.absolute, stressedIncome * rules.minimumPostStressSurplus.value.incomePercent);
    const scenarios = request.rateType === "floating" ? ["income", "rate", "expenses"] : ["income", "expenses"];
    const passes = surplus >= minimum;
    return { passes, stressedMonthlySurplus: INR({ low: surplus, high: surplus }), scenarios, reasons: [reason("STRESS_RESULT", "stress", passes ? "info" : "blocking", "STRESS_TEST", passes ? "The recommended EMI retains the configured post-stress surplus." : "The recommended EMI does not retain the configured post-stress surplus.", ["financial", "request.rateType"])] };
}
function selectedTenure(request, product, rules) {
    const requested = toRange(request.preferredTenureMonths);
    const available = rules.tenureOptions.value[product];
    if (requested)
        return available.reduce((closest, candidate) => Math.abs(candidate - requested.low) < Math.abs(closest - requested.low) ? candidate : closest, available[0]);
    return available[available.length - 1];
}
function confidence(profile, offer, rules) {
    let score = 100;
    const penalties = rules.confidencePenalties.value;
    if (profile.financial.monthlyIncome.kind === "unknown")
        score -= penalties.unknownIncome;
    if (profile.financial.essentialMonthlyExpenses.kind === "unknown")
        score -= penalties.unknownExpenses;
    if (profile.financial.existingEmis.kind === "unknown")
        score -= penalties.unknownExistingEmis;
    if (profile.credit.scoreStatus !== "known")
        score -= penalties.unknownCredit;
    if (!offer || offer.processingFee.kind === "unknown")
        score -= penalties.unknownFees;
    if (profile.collateral.type !== "none" && (profile.collateral.ownershipVerified !== true || profile.collateral.unencumbered !== true))
        score -= penalties.unverifiedCollateral;
    if (profile.incomeStability !== "stable")
        score -= penalties.variableIncome;
    return score >= 80 ? "high" : score >= 55 ? "medium" : "low";
}
function verdict(profile, request, affordability, stress) {
    const requested = toRange(request.requestedAmount);
    const severeDebtStress = hasKnownTrue(profile.credit.recentBounce) && hasKnownTrue(profile.credit.highCostDebtPresent)
        && (profile.financial.existingEmis.kind === "unknown" || affordability.recommendedMaximumEmi === 0 || stress.passes === false);
    if (severeDebtStress)
        return { value: "dontBorrow", reasons: [reason("VERDICT_DONT_BORROW", "verdict", "blocking", "VERDICT_GATES", "Do not add new borrowing now because a recent repayment problem and high-cost debt indicate acute repayment stress.", ["financial", "credit.recentBounce", "credit.highCostDebtPresent"])] };
    if (!requested || !affordability.safeBorrowing || affordability.recommendedMaximumEmi === null)
        return { value: "needsInformation", reasons: [reason("VERDICT_NEEDS_INFORMATION", "verdict", "blocking", "VERDICT_GATES", "We need complete income, expense, EMI, and requested-amount information before making a borrowing recommendation.", ["financial", "request"])] };
    if (affordability.recommendedMaximumEmi === 0 || stress.passes === false)
        return { value: "dontBorrow", reasons: [reason("VERDICT_DONT_BORROW", "verdict", "blocking", "VERDICT_GATES", "Do not add new borrowing now because the conservative affordability or stress test fails.", ["financial", "credit.recentBounce", "credit.highCostDebtPresent"])] };
    if (requested.high > affordability.safeBorrowing.low)
        return { value: "borrowLess", reasons: [reason("VERDICT_BORROW_LESS", "verdict", "caution", "VERDICT_GATES", "The requested amount exceeds the conservative safe borrowing amount; reduce the amount or extend the assessment with more information.", ["request.requestedAmount", "affordability.safeBorrowing"])] };
    return { value: "borrow", reasons: [reason("VERDICT_BORROW", "verdict", "info", "VERDICT_GATES", "The requested amount is within the conservative safe borrowing amount and passes the stress test.", ["request.requestedAmount", "stress"])] };
}
function tenureTradeoffs(affordability, request, rate, product, stress, rules) {
    if (!affordability.safeBorrowing || affordability.recommendedMaximumEmi === null)
        return [];
    const principal = affordability.safeBorrowing.low;
    const safeEmi = affordability.recommendedMaximumEmi;
    return rules.tenureOptions.value[product].map((months) => {
        const emi = calculateEmi(principal, rate.high, months);
        const totalRepayment = emi * months;
        return { months, emi, totalRepayment, totalInterest: totalRepayment - principal, passesSafety: emi <= safeEmi, passesStress: stress.passes };
    });
}
export function assessBorrower(input, rules = DEFAULT_RULES) {
    const product = routeProduct(input.borrower, input.request);
    const { band: fairRate, reasons: rateReasons } = calculateFairRate(product, input.borrower, rules);
    const affordabilityCalculation = affordability(input.borrower, input.request, fairRate, product, rules);
    const eligibilityResult = eligibility(input.borrower, input.request, fairRate, product, rules);
    const apr = calculateApr(input.request, input.offer, fairRate, product, rules);
    const stress = stressTest(input.borrower, input.request, fairRate, product, affordabilityCalculation.result.recommendedMaximumEmi, rules);
    const verdictResult = verdict(input.borrower, input.request, affordabilityCalculation.result, stress);
    const tenureOptions = tenureTradeoffs(affordabilityCalculation.result, input.request, fairRate, product, stress, rules);
    const confidenceLevel = confidence(input.borrower, input.offer, rules);
    const allReasons = [...rateReasons, ...affordabilityCalculation.reasons, ...eligibilityResult.reasons, ...apr.reasons, ...stress.reasons, ...verdictResult.reasons];
    const suggested = tenureOptions.find((option) => option.passesSafety && option.passesStress)?.months ?? null;
    return {
        verdict: verdictResult.value,
        eligibility: eligibilityResult,
        affordability: affordabilityCalculation.result,
        fairRate,
        apr,
        stress,
        tenureOptions,
        confidence: confidenceLevel,
        reasons: allReasons,
        negotiationCard: { product, requestedAmount: toRange(input.request.requestedAmount) ? INR(toRange(input.request.requestedAmount)) : null, likelyLenderSanction: eligibilityResult.likelySanction, safeBorrowing: affordabilityCalculation.result.safeBorrowing, fairRate, estimatedApr: apr, recommendedMaximumEmi: affordabilityCalculation.result.recommendedMaximumEmi, suggestedTenureMonths: suggested, stress, confidence: confidenceLevel, keyReasons: allReasons.slice(0, 8) }
    };
}
