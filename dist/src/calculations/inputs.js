export function isUnknown(input) {
    return input.kind === "unknown";
}
export function toRange(input) {
    if (input.kind === "unknown")
        return null;
    if (input.kind === "known")
        return { kind: "range", low: input.value, high: input.value };
    return input;
}
export function range(low, high) {
    return { low: Math.min(low, high), high: Math.max(low, high) };
}
