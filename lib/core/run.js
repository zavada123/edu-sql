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
/**
 * The database of a case. Every query runs on a fresh copy, so a student can
 * try DELETE or DROP without breaking the case.
 */
export class Sandbox {
    #sql;
    #image;
    constructor(sql, setup) {
        this.#sql = sql;
        const db = new sql.Database();
        try {
            db.run(setup);
            this.#image = db.export();
        }
        finally {
            db.close();
        }
    }
    /** Runs the student's SQL on a fresh copy of the database. */
    run(query) {
        const db = new this.#sql.Database(this.#image);
        try {
            return runAll(db, query);
        }
        catch (e) {
            const raw = errorText(e);
            return { kind: "error", message: explainError(raw), raw };
        }
        finally {
            db.close();
        }
    }
}
