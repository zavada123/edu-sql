/** What the host saves: the database file, the editor text and the names. */
export interface SandboxSnapshot {
  /** Name of the database that the student sees and can change. */
  readonly name: string
  /** Id of the template the database came from, or "" for a file. */
  readonly template: string
  readonly queries: string
  /** The `.sqlite` file, or null before the student chose a database. */
  readonly image: Uint8Array | null
}
