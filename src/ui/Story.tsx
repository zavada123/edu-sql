import type { StoryLine } from "../core/index.ts"
import { RichText } from "./RichText.tsx"
import { Robot } from "./Robot.tsx"

/** Story lines: the robot speaks in chat bubbles, the narrator sets the scene. */
export const Story = ({ lines }: { readonly lines: readonly StoryLine[] }) => (
  <div className="edu-sql-story">
    {lines.map((line, i) =>
      line.speaker === "robot" ? (
        <div key={i} className="edu-sql-say" style={{ animationDelay: `${i * 90}ms` }}>
          <Robot size={40} />
          <div className="edu-sql-bubble">
            <span className="edu-sql-who">Біт · робот-помічник</span>
            <p>
              <RichText text={line.text} />
            </p>
          </div>
        </div>
      ) : (
        <p key={i} className={line.speaker === "witness" ? "edu-sql-witness" : "edu-sql-narrator"} style={{ animationDelay: `${i * 90}ms` }}>
          <RichText text={line.text} />
        </p>
      )
    )}
  </div>
)
