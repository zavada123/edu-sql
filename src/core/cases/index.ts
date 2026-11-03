import type { Case } from "../types.ts"
import { lostCup } from "./lost-cup.ts"

export { lostCup }

/** All cases, in the order a student plays them. */
export const cases: readonly Case[] = [lostCup]
