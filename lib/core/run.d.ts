import type { SqlJsStatic } from "sql.js";
import type { RunResult } from "./types.ts";
/**
 * The most rows one query may read. A cross join of big tables could otherwise
 * freeze the page; the student sees a message instead.
 */
export declare const MAX_ROWS = 5000;
/**
 * The database of a case. Every query runs on a fresh copy, so a student can
 * try DELETE or DROP without breaking the case. Foreign keys are on in the copies.
 */
export declare class Sandbox {
    #private;
    /** `setup` runs with foreign keys off, as in the SQLite shell, so the case data can be in any order. */
    constructor(sql: SqlJsStatic, setup: string, from?: Uint8Array | null);
    /** Runs the student's SQL on a fresh copy of the database. */
    run(query: string): RunResult;
    /** The database after the SQL, or the error of the SQL. The student's SQL goes here. */
    attempt(query: string): Sandbox | {
        readonly kind: "error";
        readonly message: string;
        readonly raw: string;
    };
    /** The database after SQL that is known to work, such as a reference solution. Results are kept for the next call. */
    after(query: string): Sandbox;
}
