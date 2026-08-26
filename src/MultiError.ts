export default class MultiError extends Error {
  errors: any[]
  constructor(message: string | undefined, errors: any[] = []) {
    super(message)
    this.errors = errors
  }
}
