import type { Sandbox } from "./run.ts";
import type { BuildStep, Case, TableInfo, Trial, Verdict } from "./types.ts";
/** One trial after a check: what the student's table did and whether it is right. */
export interface TrialResult {
    readonly label: string;
    /** True when the student's database accepted the record. */
    readonly accepted: boolean;
    readonly passed: boolean;
    readonly why: string;
}
export interface BuildCheck {
    readonly verdict: Verdict;
    /** Empty when the check stopped before the trials (an error or a wrong table). */
    readonly trials: readonly TrialResult[];
}
/**
 * The type affinity of a declared column type, by the rules of SQLite (section 3.1 of "Datatypes In SQLite"):
 * `VARCHAR(30)` is TEXT, `INT` and `BIGINT` are INTEGER, `DOUBLE` is REAL.
 */
export declare const affinity: (declared: string) => string;
/** Runs one trial on the student's database and on the reference database. */
export declare const runTrial: (got: Sandbox, want: Sandbox, trial: Trial) => TrialResult;
/**
 * Checks a build step: the student's SQL runs on `base` (the database of the step), then the columns, the rows
 * and the trials are compared with the result of the reference solution.
 */
export declare const checkBuild: (base: Sandbox, step: BuildStep, sql: string) => BuildCheck;
/**
 * The database a step starts from: the case database after the reference solutions of the earlier build steps
 * and the SQL that runs after each of them. The databases are kept in `sandbox`, so this is fast after the first call.
 */
export declare const stepSandbox: (sandbox: Sandbox, c: Case, stepId: string) => Sandbox;
/** True when the case has build steps: then the schema panel shows the tables of the live database. */
export declare const hasBuildSteps: (c: Case) => boolean;
/**
 * The tables of a database for the schema panel. A note from `known` (the case description) is kept;
 * other columns get a note from their keys: "(ключ)" or a link such as "(pets.id)".
 */
export declare const describeTables: (db: Sandbox, known: readonly TableInfo[]) => TableInfo[];
