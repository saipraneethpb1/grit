import { themeVersion } from './Colors';

/**
 * A value built from the live palette that rebuilds when the palette changes.
 *
 * `const styles = themed(() => StyleSheet.create({ ... }))` reads exactly like a
 * plain style sheet (`styles.card`, `...styles.text`), but the factory runs
 * again after `applyColorScheme`, so light and dark each get their own colours.
 * Use it for every module-level value that captures a colour.
 */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  let built = -1;
  const current = (): T => {
    const v = themeVersion();
    if (!cache || built !== v) {
      cache = factory();
      built = v;
    }
    return cache;
  };
  return new Proxy({} as T, {
    get: (_, key) => {
      const value = Reflect.get(current(), key);
      // Array methods (map, slice…) need the real array as `this`.
      return typeof value === 'function' ? value.bind(current()) : value;
    },
    has: (_, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, key) => {
      const d = Reflect.getOwnPropertyDescriptor(current(), key);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}
