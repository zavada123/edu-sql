/** Most undo steps that the sandbox keeps. */
export const MAX_UNDO_STEPS = 10

/**
 * Images of the database before the last changes, the newest last. Immutable: every operation returns a new stack.
 */
export class UndoStack {
  readonly #images: readonly Uint8Array[]

  constructor(images: readonly Uint8Array[] = []) {
    this.#images = images.slice(-MAX_UNDO_STEPS)
  }

  get size(): number {
    return this.#images.length
  }

  /** Keeps the image of the database before a change. */
  push(image: Uint8Array): UndoStack {
    return new UndoStack([...this.#images, image])
  }

  /** The newest image and the stack without it, or undefined when there is nothing to undo. */
  pop(): { readonly image: Uint8Array; readonly rest: UndoStack } | undefined {
    const image = this.#images[this.#images.length - 1]
    return image === undefined ? undefined : { image, rest: new UndoStack(this.#images.slice(0, -1)) }
  }
}
