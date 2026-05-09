import {run} from 'node:test'
import {spec as SpecReporter} from 'node:test/reporters'
import {globSync} from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const wantBundles = args.has('--bundles')
const wantOnlyBundle = ['mini', 'lite', 'full'].find(name => args.has('--' + name))

const normalize = file => file.replaceAll('\\', '/')

function pickFiles() {
	if (wantOnlyBundle) {
		return [`test/bundle-${wantOnlyBundle}.spec.mjs`]
	}
	const all = globSync('test/**/*.spec.mjs').map(normalize)
	const isBundleFile = f => /\/bundle-(mini|lite|full)\.spec\.mjs$/.test(f)
	const isWebpackFile = f => f.includes('/webpack/')
	if (wantBundles) {
		return all.filter(f => isBundleFile(f) && !isWebpackFile(f))
	}
	return all.filter(f => !isBundleFile(f) && !isWebpackFile(f))
}

const files = pickFiles().map(f => path.resolve(f))

if (files.length === 0) {
	console.error('No test files matched.')
	process.exit(1)
}

const stream = run({files, concurrency: true})
stream.on('test:fail', () => {
	process.exitCode = 1
})
stream.compose(new SpecReporter()).pipe(process.stdout)
