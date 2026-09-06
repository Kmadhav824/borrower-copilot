import type { IncomeType, ProductType, SourceType } from "../domain/borrower/types.js";
export interface RuleDefinition<T> {
    readonly id: string;
    readonly value: T;
    readonly sourceType: SourceType;
    readonly rationale: string;
    readonly limitations: string;
}
export interface EngineRules {
    readonly safeDebtServiceCaps: RuleDefinition<Record<IncomeType, number>>;
    readonly lenderDebtServiceCaps: RuleDefinition<Record<IncomeType, readonly [number, number]>>;
    readonly retainedBufferPercent: RuleDefinition<Record<IncomeType, number>>;
    readonly incomeRecognition: RuleDefinition<Record<IncomeType, readonly [number, number]>>;
    readonly incomeShock: RuleDefinition<Record<IncomeType, number>>;
    readonly expenseShock: RuleDefinition<number>;
    readonly floatingRateShock: RuleDefinition<number>;
    readonly minimumPostStressSurplus: RuleDefinition<{
        readonly absolute: number;
        readonly incomePercent: number;
    }>;
    readonly collateralLtv: RuleDefinition<readonly [number, number]>;
    readonly productRateBands: RuleDefinition<Record<ProductType, readonly [number, number]>>;
    readonly profileRateBands: RuleDefinition<Record<ProductType, Record<"strong" | "standard" | "limited" | "stressed", readonly [number, number]>>>;
    readonly tenureOptions: RuleDefinition<Record<ProductType, readonly number[]>>;
    readonly confidencePenalties: RuleDefinition<Record<string, number>>;
}
export declare const DEFAULT_RULES: EngineRules;
