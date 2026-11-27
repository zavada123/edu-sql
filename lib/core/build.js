import { compareTables, missingWords } from "./check.js";
/** SQL text of a name in double quotes. */
const quoteName = (name) => `"${name.replace(/"/g, '""')}"`;
/** SQL text of a value in single quotes. */
const quoteText = (text) => `'${text.replace(/'/g, "''")}'`;
/**
 * The type affinity of a declared column type, by the rules of SQLite (section 3.1 of "Datatypes In SQLite"):
 * `VARCHAR(30)` is TEXT, `INT` and `BIGINT` are INTEGER, `DOUBLE` is REAL.
 */
export const affinity = (declared) => {
    const t = declared.toUpperCase();
    if (t.includes("INT"))
        return "INTEGER";
    if (/CHAR|CLOB|TEXT/.test(t))
        return "TEXT";
    if (t.includes("BLOB") || t.trim() === "")
        return "BLOB";
    if (/REAL|FLOA|DOUB/.test(t))
        return "REAL";
    return "NUMERIC";
};
const rowsOf = (result) => (result.kind === "table" ? result.table.rows : []);
/** Columns of a table, or undefined when there is no such table. Names are in lower case: SQLite ignores their case. */
const columnsOf = (db, table) => {
    const found = rowsOf(db.run(`SELECT name FROM sqlite_schema WHERE type = 'table' AND lower(name) = lower(${quoteText(table)})`));
    if (found.length === 0)
        return undefined;
    return rowsOf(db.run(`SELECT name, type FROM pragma_table_info(${quoteText(table)})`)).map((r) => ({
        name: String(r[0]).toLowerCase(),
        type: String(r[1] ?? "")
    }));
};
/** The first difference in the columns of a table, or ok. */
const compareColumns = (got, want, table) => {
    const g = columnsOf(got, table);
    const w = columnsOf(want, table) ?? [];
    if (g === undefined)
        return { kind: "missingTable", table };
    for (const col of w) {
        const mine = g.find((c) => c.name === col.name);
        if (mine === undefined)
            return { kind: "missingColumn", table, column: col.name };
        const [a, b] = [affinity(mine.type), affinity(col.type)];
        if (a !== b)
            return { kind: "columnType", table, column: col.name, got: mine.type, want: b };
    }
    const extra = g.find((c) => !w.some((x) => x.name === c.name));
    return extra === undefined ? { kind: "ok" } : { kind: "extraColumn", table, column: extra.name };
};
/** Compares the rows of a table by the columns of the reference, so the order of columns is free. */
const compareRows = (got, want, table) => {
    const cols = (columnsOf(want, table) ?? []).map((c) => quoteName(c.name)).join(", ");
    const select = `SELECT ${cols} FROM ${quoteName(table)}`;
    const g = got.run(select);
    const w = want.run(select);
    if (g.kind !== "table" || w.kind !== "table")
        return { kind: "rowValues", table };
    const v = compareTables(g.table, w.table, false);
    if (v.kind === "tooMany" || v.kind === "tooFew")
        return { kind: "rowCount", table, got: v.got, want: v.want };
    return v.kind === "ok" ? v : { kind: "rowValues", table };
};
const sameOutcome = (a, b) => {
    if (a.kind === "error" || b.kind === "error")
        return a.kind === b.kind;
    if (a.kind === "table" && b.kind === "table")
        return compareTables(a.table, b.table, false).kind === "ok";
    return a.kind === b.kind;
};
/** Runs one trial on the student's database and on the reference database. */
export const runTrial = (got, want, trial) => {
    const g = got.run(trial.sql);
    return { label: trial.label, accepted: g.kind !== "error", passed: sameOutcome(g, want.run(trial.sql)), why: trial.why };
};
const firstWrong = (checks) => {
    for (const check of checks) {
        const v = check();
        if (v.kind !== "ok")
            return v;
    }
    return { kind: "ok" };
};
/**
 * Checks a build step: the student's SQL runs on `base` (the database of the step), then the columns, the rows
 * and the trials are compared with the result of the reference solution.
 */
export const checkBuild = (base, step, sql) => {
    const got = base.attempt(sql);
    if ("kind" in got)
        return { verdict: { kind: "error", message: got.message }, trials: [] };
    const want = base.after(step.solution);
    const shape = firstWrong([
        ...step.tables.map((t) => () => compareColumns(got, want, t)),
        ...step.data.map((t) => () => compareRows(got, want, t))
    ]);
    if (shape.kind !== "ok")
        return { verdict: shape, trials: [] };
    const trials = step.trials.map((t) => runTrial(got, want, t));
    const failed = trials.filter((t) => !t.passed).length;
    if (failed > 0)
        return { verdict: { kind: "trials", failed, total: trials.length }, trials };
    const missing = missingWords(sql, step.mustUse);
    return { verdict: missing.length > 0 ? { kind: "mustUse", words: missing } : { kind: "ok" }, trials };
};
/**
 * The database a step starts from: the case database after the reference solutions of the earlier build steps
 * and the SQL that runs after each of them. The databases are kept in `sandbox`, so this is fast after the first call.
 */
export const stepSandbox = (sandbox, c, stepId) => {
    let db = sandbox;
    for (const step of c.chapters.flatMap((ch) => ch.steps)) {
        if (step.id === stepId)
            return db;
        if (step.kind === "build")
            db = db.after(step.solution).after(step.after);
    }
    return db;
};
/** True when the case has build steps: then the schema panel shows the tables of the live database. */
export const hasBuildSteps = (c) => c.chapters.some((ch) => ch.steps.some((s) => s.kind === "build"));
/** The SQLite type as it was written, or a dash for a column without a type. */
const typeLabel = (type) => (type === "" ? "—" : type);
/**
 * The tables of a database for the schema panel. A note from `known` (the case description) is kept;
 * other columns get a note from their keys: "(ключ)" or a link such as "(pets.id)".
 */
export const describeTables = (db, known) => rowsOf(db.run("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")).map((r) => {
    const name = String(r[0]);
    const doc = known.find((t) => t.name === name);
    const links = rowsOf(db.run(`SELECT "from", "table", "to" FROM pragma_foreign_key_list(${quoteText(name)})`));
    const columns = rowsOf(db.run(`SELECT name, type, pk FROM pragma_table_info(${quoteText(name)})`)).map((c) => {
        const col = String(c[0]);
        const docNote = doc?.columns.find((x) => x.name === col)?.note;
        const link = links.find((l) => l[0] === col);
        const note = docNote ?? (Number(c[2]) > 0 ? "(ключ)" : link !== undefined ? `(${String(link[1])}.${String(link[2] ?? "id")})` : "");
        return { name: col, type: typeLabel(String(c[1] ?? "")), note };
    });
    return { name, note: doc?.note ?? "", columns };
});
