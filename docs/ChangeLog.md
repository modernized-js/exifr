# Changelog

## @modernized/exifr@8.0.2 — 2026-07-06

Maintenance and tooling release. No runtime library or public API changes — the
parsing behavior of `@modernized/exifr` is unchanged from `8.0.1`.

- **TypeScript strict mode** (#36): Enabled `strict` (minus `noImplicitAny`)
  across the source tree, tightening internal type safety.
- **Lint cleanup** (#35): Zeroed out all remaining ESLint warnings.
- **Dev directories rehabilitated for v8** (#37): Restored `examples/`, `debug/`,
  and `benchmark/` so they run against the modernized v8 codebase.
- **CI action upgrades** (#38): Bumped `actions/checkout` and `actions/setup-node`
  to v6.
- **Dev dependency updates** (#39): `@arethetypeswrong/cli` `0.18.2 → 0.18.4`,
  `express` (test static server) `4 → 5.2.1`.

📦 npm: https://www.npmjs.com/package/@modernized/exifr/v/8.0.2
