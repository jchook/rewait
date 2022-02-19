/**
 *
 * Fn: A function that can be retried or run in sequence.
 *
 * If the function fails, it MUST throw.
 *
 * For now, let's ignore the return value of retried functions.
 * @link https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#callback-types
 *
 * Despite attempts, I don't think TypeScript 4.5 can correctly handle the
 * dynamic nature of user-input arrays of functions. To avoid dependence on an
 * untyped API, let's ignore the return values for now and then upgrade rewait
 * when TypeScript improves.
 *
 * We have exciting advancements in 4.0+ that move in this direction:
 * @link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types
 *
 */
export interface Fn {
  (...args: any[]): void | Promise<any>
}


