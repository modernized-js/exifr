import {promises as fs} from 'fs'
import {builtinModules} from 'module'
import {terser} from 'rollup-plugin-terser'
import pkg from './package.json'


// Webpack consumers should keep `import('http')` etc. as a runtime import
// rather than try to bundle Node built-ins. Source code in src/util/import.mjs
// already carries the magic comment, but terser's default settings strip
// comments, so we re-inject after the chunk is rendered.
function injectIgnoreComments() {
	return {
		renderChunk(code) {
			return code.replace(/import\(/g, 'import(/* webpackIgnore: true */ ')
		}
	}
}

// Mirror every emitted .cjs / .mjs as a plain .js so the package.json
// "main" / "module" fields keep their historical extensions and existing
// consumers don't break.
function cloneCjsAndMjsToJs() {
	return {
		writeBundle(bundle) {
			let target = bundle.file.replace('.cjs', '.js').replace('.mjs', '.js')
			fs.copyFile(bundle.file, target)
		}
	}
}

const terserConfig = {
	compress: true,
	mangle: true,
	toplevel: true,
}

const external = [...builtinModules, ...Object.keys(pkg.dependencies || {})]
const globals = Object.fromEntries(external.map(name => [name, name]))

const name = pkg.name
const amd = {id: pkg.name}

function createBundle(inputPath, esmPath, umdPath) {
	return {
		input: inputPath,
		plugins: [
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
		output.push(createBundle('src/bundles/full.mjs', 'dist/full.esm.mjs', 'dist/full.umd.cjs'))
	}
	if (bundle === 'lite' || bundle === undefined) {
		delete args.input
		output.push(createBundle('src/bundles/lite.mjs', 'dist/lite.esm.mjs', 'dist/lite.umd.cjs'))
	}
	if (bundle === 'mini' || bundle === undefined) {
		delete args.input
		output.push(createBundle('src/bundles/mini.mjs', 'dist/mini.esm.mjs', 'dist/mini.umd.cjs'))
	}
	return output
}
