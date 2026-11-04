import type { Case } from "../types.ts"
import { fakeVotes } from "./fake-votes.ts"
import { lostCup } from "./lost-cup.ts"

export { fakeVotes, lostCup }

/** All cases, in the order a student plays them. */
export const cases: readonly Case[] = [lostCup, fakeVotes]
