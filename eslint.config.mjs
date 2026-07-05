import js from '@eslint/js'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'

export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'dist-types/**',
			'node_modules/**',
			'coverage/**',
			'homepage/**',
			'examples/**',
			'benchmark/**',
			'debug/**',
			'test/webpack/dist/**',
			'test/fixtures/**',
			// Hand-written declaration files use TS-specific syntax
			// (`declare`, `export as namespace`) that confuses ESLint when
			// run as a JS file.
			'*.d.ts',
			'*.d.mts',
			'*.d.cts',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
		plugins: {
			'unused-imports': unusedImports,
		},
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.browser,
				...globals.mocha,
			},
		},
		rules: {
			'unused-imports/no-unused-imports': 'warn',
			// `no-unused-vars` is replaced by `@typescript-eslint/no-unused-vars`
			// further down — keeping both on duplicates every warning.
			'no-unused-vars': 'off',
			'no-empty': ['warn', {allowEmptyCatch: true}],
			'no-prototype-builtins': 'off',
			'no-cond-assign': 'off',
			'no-fallthrough': 'off',
			'no-control-regex': 'off',
			'no-misleading-character-class': 'off',
			// Pre-existing issues across src/ and test/. Downgraded so CI passes
			// while we land lint tooling. Tracked for follow-up (Phase 4 TS
			// migration will surface and fix many of these naturally).
			'getter-return': 'warn',
			'no-async-promise-executor': 'warn',
			'no-redeclare': 'warn',
			'no-constant-binary-expression': 'warn',
			'valid-typeof': 'warn',
			'no-dupe-keys': 'warn',
			'for-direction': 'warn',
			'no-undef': 'warn',
			'no-var': 'warn',
			'prefer-const': 'warn',
			// TypeScript-specific rules tuned for the migration window.
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_'}],
			'@typescript-eslint/no-this-alias': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-expressions': ['warn', {
				allowShortCircuit: true, // `isNode && describe(...)` test idiom
				allowTernary: true,
			}],
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/ban-ts-comment': ['warn', {
				'ts-ignore': 'allow-with-description',
				'ts-expect-error': 'allow-with-description',
			}],
		},
	},
)
