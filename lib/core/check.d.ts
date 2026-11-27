import type { Sandbox } from "./run.ts";
import type { AnswerStep, Case, Progress, QueryStep, Report, ResultTable, Step, StepCheck, TaskStep, Verdict } from "./types.ts";
/**
 * Compares the student's table with the correct one. Column names are ignored,
 * so `SELECT name AS ім_я` is accepted; the order of columns matters.
 */
export declare const compareTables: (got: ResultTable, want: ResultTable, ordered: boolean) => Verdict;
/** SQL words from `words` that the query does not contain. */
export declare const missingWords: (sql: string, words: readonly string[]) => string[];
/** What a query check needs: a query step of a case, or a practice task of the sandbox. */
export type QueryCheck = Pick<QueryStep, "solution" | "ordered" | "mustUse">;
/** Runs the student's query and the reference query and compares the results. */
export declare const checkQuery: (sandbox: Sandbox, step: QueryCheck, sql: string) => Verdict;
/** Lower case, single spaces, ґ = г, ё = е, apostrophes unified. */
export declare const normalizeAnswer: (s: string) => string;
export declare const checkAnswer: (step: AnswerStep, text: string) => Verdict;
/** A short message about a verdict, in Ukrainian. */
export declare const verdictMessage: (v: Verdict) => string;
/** Ukrainian plural form for a count. */
export declare const plural: (n: number, one: string, few: string, many: string) => string;
/** The reference query or the first accepted answer: a text that solves the step. */
export declare const referenceAnswer: (step: TaskStep) => string;
/** What the student must do: the task of a query or build step, or the question of an answer step. */
export declare const taskText: (step: TaskStep) => string;
export declare const allSteps: (c: Case) => Step[];
/** Steps that the student must solve, without lessons. */
export declare const taskSteps: (c: Case) => TaskStep[];
export declare const emptyProgress: (c: Case) => Progress;
/**
 * True when the step is behind the student. A lesson also counts as done when a later step is solved,
 * so that progress saved before the lesson was added does not send the student back.
 */
export declare const isStepDone: (c: Case, p: Progress, stepId: string) => boolean;
/** The first step that is not done yet, or undefined when the case is finished. */
export declare const currentStep: (c: Case, p: Progress) => Step | undefined;
/** Marks a step solved and keeps the accepted query or answer. A solved step keeps its first answer. */
export declare const markSolved: (p: Progress, stepId: string, answer: string) => Progress;
/** Score from 0 to 1 for the solved task steps: 1 per step, minus 0.25 per hint, but at least 0.5 per step. */
export declare const caseScore: (c: Case, solved: readonly string[], hintsUsed: Readonly<Record<string, number>>) => number;
/**
 * Checks every task step of a case again with the saved answers, for example on a server before it
 * issues a certificate. A step without an answer does not pass. Lessons are not checked.
 */
export declare const checkCase: (sandbox: Sandbox, c: Case, answers: Readonly<Record<string, string>>) => StepCheck[];
/** Checks the query, the answer or the build of a task step on the database of the step. */
export declare const checkStep: (base: Sandbox, step: TaskStep, text: string) => Verdict;
export declare const makeReport: (c: Case, p: Progress, stepId: string) => Report;
