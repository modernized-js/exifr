import js from '@eslint/js'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'node_modules/**',
			'coverage/**',
			'homepage/**',
			'examples/**',
			'benchmark/**',
			'debug/**',
			'test/webpack/dist/**',
			'test/fixtures/**',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
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
			'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none'}],
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
			// TypeScript-specific rules tuned for the migration window. Most
			// .ts files still carry // @ts-nocheck and don't have explicit
			// types yet — these will tighten as types are filled in.
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_'}],
			'@typescript-eslint/no-this-alias': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/ban-ts-comment': ['warn', {
				'ts-nocheck': false, // explicitly allowed during the migration
				'ts-ignore': 'allow-with-description',
				'ts-expect-error': 'allow-with-description',
			}],
		},
	},
)
