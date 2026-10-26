import { DomainError } from './DomainError.js';

export class Validation {
  public static finite(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DomainError('INVALID_NUMBER', `${name} must be a finite number`);
    }
    return value;
  }

  public static nonNegative(value: unknown, name: string): number {
    const number = this.finite(value, name);
    if (number < 0) throw new DomainError('INVALID_NUMBER', `${name} must be non-negative`);
    return number;
  }

  public static positive(value: unknown, name: string): number {
    const number = this.finite(value, name);
    if (number <= 0) throw new DomainError('INVALID_NUMBER', `${name} must be positive`);
    return number;
  }

  public static scaleFactor(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new DomainError('INVALID_SCALE_FACTOR', 'scale factor must be positive');
    }
    return value;
  }

  public static text(value: unknown, name: string): string {
    if (typeof value !== 'string') throw new DomainError('INVALID_TEXT', `${name} must be a string`);
    return value;
  }

  public static nonBlank(value: unknown, name: string): string {
    const text = this.text(value, name);
    if (text.trim().length === 0) throw new DomainError('INVALID_TEXT', `${name} must not be empty`);
    return text;
  }

  public static position(value: number, length: number): number {
    if (!Number.isInteger(value) || value < 0 || value > length) {
      throw new DomainError('INVALID_POSITION', `position must be an integer between 0 and ${length}`);
    }
    return value;
  }
}
