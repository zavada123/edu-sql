import type { SqlJsStatic } from "sql.js";
import type { RunResult } from "./types.ts";
/**
 * The most rows one query may read. A cross join of big tables could otherwise
 * freeze the page; the student sees a message instead.
 */
export declare const MAX_ROWS = 5000;
/**
 * The database of a case. Every query runs on a fresh copy, so a student can
 * try DELETE or DROP without breaking the case.
 */
export declare class Sandbox {
    #private;
    constructor(sql: SqlJsStatic, setup: string);
    /** Runs the student's SQL on a fresh copy of the database. */
    run(query: string): RunResult;
}
