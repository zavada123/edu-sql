import type { Sandbox } from "./run.ts";
import type { AnswerStep, Case, Progress, QueryStep, Report, ResultTable, Step, StepCheck, Verdict } from "./types.ts";
/**
 * Compares the student's table with the correct one. Column names are ignored,
 * so `SELECT name AS ім_я` is accepted; the order of columns matters.
 */
export declare const compareTables: (got: ResultTable, want: ResultTable, ordered: boolean) => Verdict;
/** SQL words from `words` that the query does not contain. */
export declare const missingWords: (sql: string, words: readonly string[]) => string[];
/** Runs the student's query and the reference query and compares the results. */
export declare const checkQuery: (sandbox: Sandbox, step: QueryStep, sql: string) => Verdict;
/** Lower case, single spaces, ґ = г, ё = е, apostrophes unified. */
export declare const normalizeAnswer: (s: string) => string;
export declare const checkAnswer: (step: AnswerStep, text: string) => Verdict;
/** A short message about a verdict, in Ukrainian. */
export declare const verdictMessage: (v: Verdict) => string;
/** Ukrainian plural form for a count. */
export declare const plural: (n: number, one: string, few: string, many: string) => string;
export declare const allSteps: (c: Case) => Step[];
export declare const emptyProgress: (c: Case) => Progress;
/** The first step that is not solved yet, or undefined when the case is finished. */
export declare const currentStep: (c: Case, p: Progress) => Step | undefined;
/** Marks a step solved and keeps the accepted query or answer. A solved step keeps its first answer. */
export declare const markSolved: (p: Progress, stepId: string, answer: string) => Progress;
/** Score from 0 to 1 for the solved steps: 1 per step, minus 0.25 per hint, but at least 0.5 per step. */
export declare const caseScore: (c: Case, solved: readonly string[], hintsUsed: Readonly<Record<string, number>>) => number;
/**
 * Checks every step of a case again with the saved answers, for example on a server before it
 * issues a certificate. A step without an answer does not pass.
 */
export declare const checkCase: (sandbox: Sandbox, c: Case, answers: Readonly<Record<string, string>>) => StepCheck[];
export declare const makeReport: (c: Case, p: Progress, stepId: string) => Report;
