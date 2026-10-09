/**
 * Minimal type shim for Bun's built-in test runner (`bun test`), so
 * `tsc --noEmit` and ESLint accept `*.test.ts` files without adding a
 * testing dependency. At runtime Bun provides the real implementation.
 */
declare module "bun:test" {
  export interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(item: unknown): void;
    toContainEqual(item: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThan(n: number): void;
    toHaveLength(n: number): void;
    toMatch(pattern: string | RegExp): void;
    toThrow(expected?: string | RegExp): void;
    not: Matchers;
  }
  export function expect(actual: unknown): Matchers;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
}
