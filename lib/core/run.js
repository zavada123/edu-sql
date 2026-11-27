import { explainError } from "./errors.js";
/**
 * The most rows one query may read. A cross join of big tables could otherwise
 * freeze the page; the student sees a message instead.
 */
export const MAX_ROWS = 5000;
const toCell = (v) => (v instanceof Uint8Array ? "[дані]" : v);
const errorText = (e) => (e instanceof Error ? e.message : String(e));
/** Reads the rows of one statement, but not more than MAX_ROWS. */
const readRows = (stmt) => {
    const rows = [];
    while (stmt.step()) {
        if (rows.length >= MAX_ROWS)
            return "tooMany";
        rows.push(stmt.get().map(toCell));
    }
    return { columns: stmt.getColumnNames(), rows };
};
/** Runs every statement of the text and keeps the result of the last one that returns columns. */
const runAll = (db, sql) => {
    let last = { kind: "empty" };
    for (const stmt of db.iterateStatements(sql)) {
        try {
            const table = readRows(stmt);
            if (table === "tooMany") {
                return {
                    kind: "error",
                    message: `Запит повертає понад ${MAX_ROWS} рядків. Мабуть, таблиці з'єднано без умови ON або забуто WHERE.`,
                    raw: "row limit"
                };
            }
            if (table.columns.length > 0)
                last = { kind: "table", table };
        }
        finally {
            stmt.free();
        }
    }
    return last;
};
/** Runs SQL and turns an exception into an error result. */
const runSafe = (db, sql) => {
    try {
        return runAll(db, sql);
    }
    catch (e) {
        const raw = errorText(e);
        return { kind: "error", message: explainError(raw), raw };
    }
};
/** Foreign keys are off in SQLite by default and the setting is not saved in the file, so every copy turns them on. */
const FOREIGN_KEYS_ON = "PRAGMA foreign_keys = ON";
/**
 * The database of a case. Every query runs on a fresh copy, so a student can
 * try DELETE or DROP without breaking the case. Foreign keys are on in the copies.
 */
export class Sandbox {
    #sql;
    #image;
    /** Databases made from this one by `after`, by their SQL. */
    #next = new Map();
    /** `setup` runs with foreign keys off, as in the SQLite shell, so the case data can be in any order. */
    constructor(sql, setup, from = null) {
        this.#sql = sql;
        const db = new sql.Database(from ?? undefined);
        try {
            if (from !== null)
                db.run(FOREIGN_KEYS_ON);
            db.run(setup);
            this.#image = db.export();
        }
        finally {
            db.close();
        }
    }
    #copy(use) {
        const db = new this.#sql.Database(this.#image);
        try {
            db.run(FOREIGN_KEYS_ON);
            return use(db);
        }
        finally {
            db.close();
        }
    }
    /** Runs the student's SQL on a fresh copy of the database. */
    run(query) {
        return this.#copy((db) => runSafe(db, query));
    }
    /** The database after the SQL, or the error of the SQL. The student's SQL goes here. */
    attempt(query) {
        return this.#copy((db) => {
            const result = runSafe(db, query);
            return result.kind === "error" ? result : new Sandbox(this.#sql, "", db.export());
        });
    }
    /** The database after SQL that is known to work, such as a reference solution. Results are kept for the next call. */
    after(query) {
        if (query.trim() === "")
            return this;
        const kept = this.#next.get(query);
        if (kept !== undefined)
            return kept;
        const next = new Sandbox(this.#sql, "", this.#copy((db) => {
            db.run(query);
            return db.export();
        }));
        this.#next.set(query, next);
        return next;
    }
}
