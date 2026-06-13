import React from 'react';

/**
 * Shared Heroicons mock factory.
 *
 * Heroicons exports hundreds of named icons, so tests mock the package
 * with a Proxy instead of enumerating them. The previous inline Proxies
 * (duplicated across ~10 test files) had two defects that made every one
 * of those files unrunnable:
 *
 *  1. The `get` trap returned a component for ANY string prop, including
 *     `then`. Vitest's ESM interop accesses `.then` on a module namespace
 *     to decide if it is thenable; a truthy `then` made the mocked module
 *     look like a Promise, so the dynamic import never settled and the
 *     test file hung forever at collection (no test ever ran).
 *  2. No `has` trap, so Vitest's named-export validation
 *     (`import { SparklesIcon } from ...`) reported every icon as missing
 *     ("No X export is defined on the mock").
 *
 * This factory implements both traps correctly.
 */
export function heroiconsMock(testIdSuffix = 'icon') {
  const isIconName = (prop: string | symbol): prop is string =>
    typeof prop === 'string' &&
    prop !== '__esModule' &&
    prop !== 'then' &&
    prop !== 'default';

  return new Proxy(
    {},
    {
      has: (_target, prop) => isIconName(prop),
      get: (_target, prop) => {
        if (!isIconName(prop)) return undefined;
        const Icon = ({ className }: { className?: string }) => (
          <svg className={className} data-testid={`${prop}-${testIdSuffix}`} />
        );
        Icon.displayName = prop;
        return Icon;
      },
    }
  );
}
