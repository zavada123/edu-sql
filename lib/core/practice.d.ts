import type { QueryCheck } from "./check.ts";
/**
 * Practice tasks of the SQL sandbox: queries on one sandbox template, checked like the query steps of a case
 * (`checkQuery`: the result of the student's query must match the result of `solution`). There is no story and no
 * score: a task is done or not yet.
 */
export interface PracticeTask extends QueryCheck {
    readonly id: string;
    readonly title: string;
    /** What the query must return. Words in `backticks` are SQL. */
    readonly task: string;
    /** Hints from gentle to almost the answer. */
    readonly hints: readonly string[];
}
export interface PracticeSet {
    readonly id: string;
    readonly title: string;
    /** The template id (`templates`) of the database. */
    readonly database: string;
    /** The textbook topics, for the teacher. */
    readonly source: string;
    /** One paragraph before the list. */
    readonly intro: string;
    readonly tasks: readonly PracticeTask[];
}
export declare const practiceSets: readonly PracticeSet[];
/** The practice set of a template, if there is one. */
export declare const practiceFor: (database: string) => PracticeSet | undefined;
