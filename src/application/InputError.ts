export class InputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}
