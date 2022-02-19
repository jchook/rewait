export default class MultiError extends Error {
  constructor(message: string | undefined, public errors: any[] = []) {
    super(message)
  }
}
