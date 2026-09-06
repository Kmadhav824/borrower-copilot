export function reason(id, output, severity, ruleId, message, inputReferences = []) {
    return { id, output, severity, ruleId, message, inputReferences };
}
