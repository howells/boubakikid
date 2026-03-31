import { customAlphabet } from "nanoid";

/**
 * Soft alphabet: lowercase alphanumeric minus angular/spiky characters.
 *
 * Based on bouba/kiki effect research — round letterforms are perceived
 * as more pleasant, approachable, and memorable. Excluded characters:
 * k, v, w, x, z (angular/spiky appearance).
 *
 * 30 characters → ~4.9 bits per character.
 */
const ALPHABET = "0123456789abcdefghijlmnopqrstuy";

/** Generate a 13-character ID (~63.7 bits of entropy). Good for file keys, primary records. */
export const id = customAlphabet(ALPHABET, 13);

/** Generate a 9-character ID (~44.1 bits of entropy). Good for short codes, share tokens. */
export const shortId = customAlphabet(ALPHABET, 9);

/** Generate a 7-character ID (~34.3 bits of entropy). Good for display names, slugs. */
export const tinyId = customAlphabet(ALPHABET, 7);

/**
 * Create a custom ID generator with the boubakikid alphabet.
 *
 * @param length Number of characters in the generated ID.
 * @returns A function that generates IDs of the specified length.
 *
 * @example
 * ```ts
 * const sessionId = createId(21);
 * console.log(sessionId()); // "a4b8c2d6e0f1g3h5i7j9l"
 * ```
 */
export function createId(length: number) {
  return customAlphabet(ALPHABET, length);
}

/** The alphabet used by all generators. */
export { ALPHABET };
