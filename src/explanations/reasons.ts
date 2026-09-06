import type { ExplanationMetadata } from "../domain/borrower/types.js";

export function reason(
  id: string,
  output: ExplanationMetadata["output"],
  severity: ExplanationMetadata["severity"],
  ruleId: string,
  message: string,
  inputReferences: readonly string[] = []
): ExplanationMetadata {
  return { id, output, severity, ruleId, message, inputReferences };
}
