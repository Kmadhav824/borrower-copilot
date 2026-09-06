import type { KnownRange, NumericInput } from "../domain/borrower/types.js";

export function isUnknown(input: NumericInput): input is { readonly kind: "unknown" } {
  return input.kind === "unknown";
}

export function toRange(input: NumericInput): KnownRange | null {
  if (input.kind === "unknown") return null;
  if (input.kind === "known") return { kind: "range", low: input.value, high: input.value };
  return input;
}

export function range(low: number, high: number): { readonly low: number; readonly high: number } {
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
