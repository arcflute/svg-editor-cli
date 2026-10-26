import { DomainError } from './DomainError.js';
import { Validation } from './Validation.js';

/** Immutable geometry value: coordinate axes and non-negative dimensions define the whitelist. */
export class Geometry {
  readonly #horizontal: Readonly<Record<string, number>>;
  readonly #vertical: Readonly<Record<string, number>>;
  readonly #dimensions: Readonly<Record<string, number>>;

  public constructor(
    horizontal: Readonly<Record<string, number>>,
    vertical: Readonly<Record<string, number>>,
    dimensions: Readonly<Record<string, number>>,
  ) {
    const names = [...Object.keys(horizontal), ...Object.keys(vertical), ...Object.keys(dimensions)];
    if (new Set(names).size !== names.length) throw new DomainError('INVALID_GEOMETRY', 'geometry field names must be distinct');
    for (const [name, value] of Object.entries({ ...horizontal, ...vertical })) Validation.finite(value, name);
    for (const [name, value] of Object.entries(dimensions)) Validation.nonNegative(value, name);
    this.#horizontal = Object.freeze({ ...horizontal });
    this.#vertical = Object.freeze({ ...vertical });
    this.#dimensions = Object.freeze({ ...dimensions });
  }

  public get values(): Readonly<Record<string, number>> {
    return Object.freeze({ ...this.#horizontal, ...this.#vertical, ...this.#dimensions });
  }

  public value(name: string): number {
    const values = this.values;
    if (!Object.hasOwn(values, name)) throw new DomainError('UNKNOWN_ATTRIBUTE', `unknown attribute: ${name}`);
    return values[name]!;
  }

  public moved(dx: number, dy: number): Geometry {
    Validation.finite(dx, 'dx');
    Validation.finite(dy, 'dy');
    return new Geometry(
      Object.fromEntries(Object.entries(this.#horizontal).map(([key, value]) => [key, value + dx])),
      Object.fromEntries(Object.entries(this.#vertical).map(([key, value]) => [key, value + dy])),
      this.#dimensions,
    );
  }

  public scaled(factor: number): Geometry {
    Validation.scaleFactor(factor);
    return new Geometry(
      Object.fromEntries(Object.entries(this.#horizontal).map(([key, value]) => [key, value * factor])),
      Object.fromEntries(Object.entries(this.#vertical).map(([key, value]) => [key, value * factor])),
      Object.fromEntries(Object.entries(this.#dimensions).map(([key, value]) => [key, value * factor])),
    );
  }

  public withAttribute(name: string, value: unknown): Geometry {
    if (!Object.hasOwn(this.values, name)) throw new DomainError('UNKNOWN_ATTRIBUTE', `unknown attribute: ${name}`);
    const number = Object.hasOwn(this.#dimensions, name)
      ? Validation.nonNegative(value, name) : Validation.finite(value, name);
    return new Geometry(
      Object.hasOwn(this.#horizontal, name) ? { ...this.#horizontal, [name]: number } : this.#horizontal,
      Object.hasOwn(this.#vertical, name) ? { ...this.#vertical, [name]: number } : this.#vertical,
      Object.hasOwn(this.#dimensions, name) ? { ...this.#dimensions, [name]: number } : this.#dimensions,
    );
  }
}
