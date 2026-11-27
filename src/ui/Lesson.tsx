import type { LessonStep } from "../core/index.ts"
import { RichText, SqlCode } from "./RichText.tsx"

/** A lesson: what the SQL words mean, the general form and a table of words. The example is in the editor. */
export const Lesson = ({ step }: { readonly step: LessonStep }) => (
  <div className="edu-sql-lesson">
    <p className="edu-sql-lesson-kicker">
      <span aria-hidden="true">📘</span> Урок детектива
    </p>
    <div className="edu-sql-why">
      <span>
        <span aria-hidden="true">🎯</span> Навіщо це
      </span>
      <p>
        <RichText text={step.why} />
      </p>
    </div>
    {step.explain.map((p, i) => (
      <p key={i}>
        <RichText text={p} />
      </p>
    ))}
    <div className="edu-sql-syntax">
      <span>Як пишеться</span>
      <SqlCode code={step.syntax} />
    </div>
    <table className="edu-sql-words">
      <tbody>
        {step.notes.map((n) => (
          <tr key={n.code}>
            <th scope="row">
              <SqlCode code={n.code} />
            </th>
            <td>
              <RichText text={n.text} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="edu-sql-instead">
      <span>
        <span aria-hidden="true">🤔</span> Чому не інакше
      </span>
      <ul>
        {step.instead.map((n) => (
          <li key={n.way}>
            <strong>
              <RichText text={n.way} />
            </strong>
            : <RichText text={n.problem} />
          </li>
        ))}
      </ul>
    </div>
    <p className="edu-sql-lesson-try">
      <span aria-hidden="true">👉</span> Приклад уже в редакторі. Натисни <strong className="rt-ui">Виконати</strong>, а потім зміни запит і подивись, що вийде.
    </p>
  </div>
)
