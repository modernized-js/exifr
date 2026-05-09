import {promises as fs} from 'fs'
import {builtinModules, createRequire} from 'module'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

// Rollup 4 no longer auto-loads JSON via `import pkg from './package.json'`,
// and the config file is treated as a plain ESM module without import
// attributes wired up — the simplest portable pattern is createRequire.
const require = createRequire(import.meta.url)
const pkg = require('./package.json')


// Webpack consumers should keep `import('http')` etc. as a runtime import
// rather than try to bundle Node built-ins. Source code in src/util/import.mjs
// already carries the magic comment, but terser's default settings strip
// comments, so we re-inject after the chunk is rendered.
function injectIgnoreComments() {
	return {
		name: 'inject-webpack-ignore-comments',
		renderChunk(code) {
			return code.replace(/import\(/g, 'import(/* webpackIgnore: true */ ')
		},
	}
}

// Mirror every emitted .cjs / .mjs as a plain .js so the package.json
// "main" / "module" fields keep their historical extensions and existing
// consumers don't break. Returning the promise so rollup awaits the copy
// before declaring the build complete — without it the build can finish
// while a mirror is still being written.
function cloneCjsAndMjsToJs() {
	return {
		name: 'clone-cjs-and-mjs-to-js',
		writeBundle(_options, bundle) {
			const promises = []
			for (const file of Object.keys(bundle)) {
				const source = `dist/${file}`
				const target = source.replace('.cjs', '.js').replace('.mjs', '.js')
				if (source !== target) promises.push(fs.copyFile(source, target))
			}
			return Promise.all(promises)
		},
	}
}

const terserConfig = {
	compress: true,
	mangle: true,
	toplevel: true,
}

const tsConfig = {
	tsconfig: './tsconfig.json',
	// Type-checking happens via `yarn typecheck`. Rollup just needs to emit
	// JavaScript through the TS compiler so .ts and .mjs sources can coexist
	// during the gradual migration. Override outDir / declaration here so
	// the plugin's emit folder matches rollup's output dir; declaration
	// emission is left to a dedicated step in a later PR.
	outDir: 'dist',
	declaration: false,
	declarationMap: false,
	emitDeclarationOnly: false,
	noEmitOnError: false,
	// Source files import each other via explicit `./foo.ts` paths during
	// the gradual migration. Pair allowImportingTsExtensions with
	// rewriteRelativeImportExtensions so the TS plugin emits JS with the
	// .ts → .js rewrite applied — this satisfies the plugin's self-check
	// (which otherwise refuses allowImportingTsExtensions for emit) and
	// keeps the bundled output free of TS5097 warnings.
	allowImportingTsExtensions: true,
	rewriteRelativeImportExtensions: true,
}

const external = [...builtinModules, ...Object.keys(pkg.dependencies || {})]
const globals = Object.fromEntries(external.map(name => [name, name]))

const name = pkg.name
const amd = {id: pkg.name}

function createBundle(inputPath, esmPath, umdPath) {
	return {
		input: inputPath,
		plugins: [
			typescript(tsConfig),
			terser(terserConfig),
			injectIgnoreComments(),
			cloneCjsAndMjsToJs(),
		],
		external,
		output: [
			{file: esmPath, format: 'esm', exports: 'named', globals},
			{file: umdPath, format: 'umd', exports: 'named', globals, name, amd},
		],
	}
}

export default args => {
	let [bundle] = args.input || []
	if (typeof args.watch === 'string') {
		bundle = args.watch
		args.watch = args.w = true
	}
	const output = []
	if (bundle === 'full' || bundle === undefined) {
		delete args.input
		output.push(createBundle('src/bundles/full.ts', 'dist/full.esm.mjs', 'dist/full.umd.cjs'))
	}
	if (bundle === 'lite' || bundle === undefined) {
		delete args.input
		output.push(createBundle('src/bundles/lite.ts', 'dist/lite.esm.mjs', 'dist/lite.umd.cjs'))
	}
	if (bundle === 'mini' || bundle === undefined) {
		delete args.input
		output.push(createBundle('src/bundles/mini.ts', 'dist/mini.esm.mjs', 'dist/mini.umd.cjs'))
	}
	return output
}
