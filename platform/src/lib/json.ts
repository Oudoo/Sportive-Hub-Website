/**
 * Server data crosses into client components as JSON, so Dates arrive as ISO strings.
 * `jsonify` does the round trip and `Jsonified<T>` describes the result.
 */
export type Jsonified<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonified<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonified<T[K]> }
      : T;

export function jsonify<T>(value: T): Jsonified<T> {
  return JSON.parse(JSON.stringify(value)) as Jsonified<T>;
}
