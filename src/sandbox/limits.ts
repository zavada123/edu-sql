/** The largest database file that the sandbox opens. Bigger files are slow on school phones. */
export const MAX_DATABASE_BYTES = 5 * 1024 * 1024

/** Undo keeps images of the database only while it is smaller than this. */
export const MAX_UNDO_DATABASE_BYTES = 2 * 1024 * 1024

/** A query that runs longer is stopped, and the database returns to the last saved state. */
export const QUERY_TIMEOUT_MS = 5000

/** The largest text file (.sql or .csv) that the sandbox imports. */
export const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024

/** Size in kilobytes or megabytes for the student. */
export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`
