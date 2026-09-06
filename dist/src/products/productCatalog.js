/** Product routing is deliberately limited to the assignment's required use cases. */
export function routeProduct(profile, request) {
    if (request.productIntent !== "unsure")
        return request.productIntent;
    if (request.purpose === "vehicle")
        return "twoWheelerLoan";
    if (request.purpose === "business") {
        const securedProperty = profile.collateral.type === "property"
            && profile.collateral.ownershipVerified === true
            && profile.collateral.unencumbered === true;
        return securedProperty ? "loanAgainstProperty" : "businessLoan";
    }
    return "personalLoan";
}
