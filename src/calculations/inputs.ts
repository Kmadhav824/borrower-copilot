import type { KnownRange, NumericInput } from "../domain/borrower/types.js";

export function isUnknown(input: NumericInput): input is { readonly kind: "unknown" } {
  return input.kind === "unknown";
}

export function toRange(input: NumericInput): KnownRange | null {
  if (input.kind === "unknown") return null;
  if (input.kind === "known") {
    if (!Number.isFinite(input.value)) return null;
    return { kind: "range", low: input.value, high: input.value };
  }
  if (!Number.isFinite(input.low) || !Number.isFinite(input.high)) return null;
  const ordered = range(input.low, input.high);
  return { kind: "range", low: ordered.low, high: ordered.high };
}

export function range(low: number, high: number): { readonly low: number; readonly high: number } {
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
