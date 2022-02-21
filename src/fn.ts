/**
 * A potentially async function that can be retried or run in sequence.
 *
 * Throw an error to indiciate a "not ready" state.
 */
export interface CheckFunction {
  (...args: any[]): any | Promise<any>
}


