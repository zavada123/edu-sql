import type { StoryLine } from "../core/index.ts"
import { Robot } from "./Robot.tsx"

/** Story lines: the robot speaks in bubbles, the narrator in plain italic text. */
export const Story = ({ lines }: { readonly lines: readonly StoryLine[] }) => (
  <div className="edu-sql-story">
    {lines.map((line, i) =>
      line.speaker === "robot" ? (
        <div key={i} className="edu-sql-say">
          <Robot />
          <p className="edu-sql-bubble">
            <span className="edu-sql-who">Біт</span>
            {line.text}
          </p>
        </div>
      ) : (
        <p key={i} className={line.speaker === "witness" ? "edu-sql-witness" : "edu-sql-narrator"}>
          {line.text}
        </p>
      )
    )}
  </div>
)
