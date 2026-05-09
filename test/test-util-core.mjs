import express from 'express'
import path from 'path'
import {promises as fs} from 'fs'
import nodeAssertLoose from 'node:assert'
import * as nodeTest from 'node:test'

// Register the mocha-style BDD globals so existing spec files keep working
// without per-file imports. node:test exposes describe / it / before / after
// already, but mocha put them on globalThis; re-publish them here so the
// migration is mechanical for individual spec files.
for (const name of ['describe', 'it', 'before', 'after', 'beforeEach', 'afterEach']) {
	globalThis[name] = nodeTest[name]
}

export var isNode = typeof process === 'object' && process.versions && process.versions.node
// Node 21+ exposes globalThis.navigator, so detect Node first and treat
// anything else as browser. Plain `typeof navigator === 'object'` would
// false-positive in modern Node.
export var isBrowser = !isNode

// chai-compatible assert object built on node:assert. Most chai assert
// methods are syntactic sugar over node:assert; the helpers below cover
// the chai-only forms (`lengthOf`, `hasAllKeys`, etc.) used in the suite.
//
// We intentionally use the loose `node:assert` (==) for `equal` to keep
// chai's semantics — many existing tests rely on `==` comparing 0 to false
// or null to undefined.
const isCollectionEmpty = value => {
	if (value == null) return true
	if (typeof value === 'string' || Array.isArray(value)) return value.length === 0
	if (value instanceof Map || value instanceof Set) return value.size === 0
	if (typeof value === 'object') return Object.keys(value).length === 0
	return false
}

export const assert = {
	equal: (a, b, msg) => nodeAssertLoose.equal(a, b, msg),
	notEqual: (a, b, msg) => nodeAssertLoose.notEqual(a, b, msg),
	strictEqual: (a, b, msg) => nodeAssertLoose.strictEqual(a, b, msg),
	deepEqual: (a, b, msg) => nodeAssertLoose.deepEqual(a, b, msg),
	fail: msg => nodeAssertLoose.fail(msg ?? 'assert.fail'),
	throws: (fn, expected, msg) => nodeAssertLoose.throws(fn, expected, msg),

	exists: (v, msg) => nodeAssertLoose.ok(v != null, msg ?? `expected value to exist, got ${v}`),
	isDefined: (v, msg) => nodeAssertLoose.notEqual(v, undefined, msg),
	isUndefined: (v, msg) => nodeAssertLoose.equal(v, undefined, msg),
	isTrue: (v, msg) => nodeAssertLoose.strictEqual(v, true, msg),
	isFalse: (v, msg) => nodeAssertLoose.strictEqual(v, false, msg),
	isNotTrue: (v, msg) => nodeAssertLoose.notStrictEqual(v, true, msg),

	isString: (v, msg) => nodeAssertLoose.equal(typeof v, 'string', msg),
	isNumber: (v, msg) => nodeAssertLoose.equal(typeof v, 'number', msg),
	isBoolean: (v, msg) => nodeAssertLoose.equal(typeof v, 'boolean', msg),
	isArray: (v, msg) => nodeAssertLoose.ok(Array.isArray(v), msg ?? `expected array, got ${typeof v}`),
	isObject: (v, msg) => nodeAssertLoose.ok(typeof v === 'object' && v !== null && !Array.isArray(v), msg),
	isError: (v, msg) => nodeAssertLoose.ok(v instanceof Error, msg),
	typeOf: (v, type, msg) => nodeAssertLoose.equal(typeof v, type, msg),

	isAtLeast: (a, b, msg) => nodeAssertLoose.ok(a >= b, msg ?? `expected ${a} >= ${b}`),
	isBelow: (a, b, msg) => nodeAssertLoose.ok(a < b, msg ?? `expected ${a} < ${b}`),

	lengthOf: (collection, length, msg) => {
		const actual = collection instanceof Map || collection instanceof Set ? collection.size : collection?.length
		nodeAssertLoose.equal(actual, length, msg)
	},
	isNotEmpty: (v, msg) => nodeAssertLoose.ok(!isCollectionEmpty(v), msg ?? 'expected non-empty value'),

	include: (haystack, needle, msg) => {
		if (typeof haystack === 'string' || Array.isArray(haystack)) {
			nodeAssertLoose.ok(haystack.includes(needle), msg ?? `expected ${haystack} to include ${needle}`)
		} else if (haystack instanceof Set) {
			nodeAssertLoose.ok(haystack.has(needle), msg)
		} else {
			nodeAssertLoose.fail(msg ?? `assert.include does not support ${typeof haystack}`)
		}
	},
	notInclude: (haystack, needle, msg) => {
		if (typeof haystack === 'string' || Array.isArray(haystack)) {
			nodeAssertLoose.ok(!haystack.includes(needle), msg ?? `expected ${haystack} not to include ${needle}`)
		} else if (haystack instanceof Set) {
			nodeAssertLoose.ok(!haystack.has(needle), msg)
		} else {
			nodeAssertLoose.fail(msg ?? `assert.notInclude does not support ${typeof haystack}`)
		}
	},

	instanceOf: (v, ctor, msg) => nodeAssertLoose.ok(v instanceof ctor, msg ?? `expected instanceof ${ctor.name}`),
	notInstanceOf: (v, ctor, msg) => nodeAssertLoose.ok(!(v instanceof ctor), msg),

	hasAllKeys: (obj, keys, msg) => {
		const actual = [...Object.keys(obj)].sort()
		const expected = [...keys].sort()
		nodeAssertLoose.deepStrictEqual(actual, expected, msg)
	},
	containsAllKeys: (obj, keys, msg) => {
		const actual = new Set(Object.keys(obj))
		for (const k of keys) nodeAssertLoose.ok(actual.has(k), msg ?? `expected key '${k}'`)
	},
	doesNotHaveAnyKeys: (obj, keys, msg) => {
		const actual = new Set(Object.keys(obj))
		for (const k of keys) nodeAssertLoose.ok(!actual.has(k), msg ?? `expected to not have key '${k}'`)
	},
}

export var btoa
if (typeof window !== 'undefined' && window.btoa)
	btoa = window.btoa
else
	btoa = string => Buffer.from(string).toString('base64')

let testFolderPath
if (isNode) {
	testFolderPath = path.dirname(import.meta.url.replace('file:///', ''))
	if (process.platform !== 'win32' && !path.isAbsolute(testFolderPath))
		testFolderPath = '/' + testFolderPath
} else {
	testFolderPath = location.href.split('/').slice(0, -1).join('/')
}

function ensurePathInFixtures(filePath) {
	if (filePath.includes('fixtures/') || filePath.includes('fixtures\\'))
		return filePath
	else
		return 'fixtures/' + filePath
}

export function getPath(filePath) {
	if (filePath.startsWith('http')) return filePath
	const fileInFixturesPath = ensurePathInFixtures(filePath)
	if (isNode)
		return path.join(testFolderPath, fileInFixturesPath)
	else
		return testFolderPath + '/' + fileInFixturesPath
}


let staticServerPort = 80
let staticServer
export function startStaticServer() {
	return new Promise(resolve => {
		const app = express()
		app.use(express.static(path.join(testFolderPath, 'fixtures')))
		app.get('/redirect', (req, res) => res.redirect('/cookiezen.jpg'))
		staticServer = app.listen(() => {
			staticServerPort = staticServer.address().port
			resolve()
		})
	})
}
export function stopStaticServer() {
	return new Promise(resolve => staticServer.close(resolve))
}

export function getUrl(filePath) {
	if (filePath.startsWith('http')) return filePath
	return `http://localhost:${staticServerPort}/${filePath}`
}


const cachedFiles = {}

export async function getFile(urlOrPath) {
	const fullPath = getPath(urlOrPath)
	if (cachedFiles[urlOrPath])
		return cachedFiles[urlOrPath]
	if (isBrowser)
		cachedFiles[urlOrPath] = await fetch(fullPath).then(res => res.arrayBuffer())
	else if (isNode)
		cachedFiles[urlOrPath] = await fs.readFile(fullPath)
	return cachedFiles[urlOrPath]
}

export function createIframe(url) {
	return new Promise((resolve, reject) => {
		const iframe = document.createElement('iframe')
		iframe.src = url
		iframe.style.width = '0px'
		iframe.style.height = '0px'
		iframe.style.opacity = 0
		iframe.onerror = reject
		iframe.onload = e => {
			iframe.contentWindow.onerror = reject
			iframe.contentWindow.testResult = resolve
		}
		document.body.append(iframe)
	})
}

const yellow = '\x1b[33m'
const colorReset = '\x1b[0m'
const warn = console.warn.bind(console)
console.warn = function(...args) {
	warn(yellow, ...args, colorReset)
}

export function assertOutputIsNotEmpty(output) {
	assert.exists(output, `output is undefined`)
}

export function assertOutputWithoutErrors(output) {
	assert.isNotEmpty(output, `output is empty`)
	assert.isUndefined(output.errors, 'there are errors in output')
}

export function assertOutputHasErrors(output) {
	assert.isNotEmpty(output, `output is empty`)
	assert.isUndefined(output.errors, 'there are no errors in output')
}
