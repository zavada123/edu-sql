import type { TrialResult } from "../core/index.ts"
import { RichText } from "./RichText.tsx"

/** The test records of a build step: what the student's table did with each one and whether it is right. */
export const Trials = ({ trials }: { readonly trials: readonly TrialResult[] }) => (
  <div className="edu-sql-trials" role="status">
    <p className="edu-sql-trials-title">
      <span aria-hidden="true">🧪</span> Випробування таблиці: {trials.filter((t) => t.passed).length} з {trials.length}
    </p>
    <ul>
      {trials.map((t, i) => (
        <li key={i} className={t.passed ? "is-ok" : "is-bad"}>
          <span className="edu-sql-trial-mark" aria-label={t.passed ? "правильно" : "неправильно"}>
            {t.passed ? "✓" : "✗"}
          </span>
          <span className="edu-sql-trial-label">
            <RichText text={t.label} />
          </span>
          <span className="edu-sql-trial-outcome">{t.accepted ? "прийнято" : "відхилено"}</span>
          {!t.passed && (
            <p className="edu-sql-trial-why">
              <RichText text={t.why} />
            </p>
          )}
        </li>
      ))}
    </ul>
  </div>
)
