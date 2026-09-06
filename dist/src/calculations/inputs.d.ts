import type { KnownRange, NumericInput } from "../domain/borrower/types.js";
export declare function isUnknown(input: NumericInput): input is {
    readonly kind: "unknown";
};
export declare function toRange(input: NumericInput): KnownRange | null;
export declare function range(low: number, high: number): {
    readonly low: number;
    readonly high: number;
};
