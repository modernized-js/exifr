import js from '@eslint/js'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
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
		},
	},
]
