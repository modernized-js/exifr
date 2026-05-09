// @ts-nocheck — TS migration in progress; types will be added in a follow-up PR
import {segmentParsers} from '../plugins.ts'
import {Options} from '../options.ts'
import {read} from '../reader.ts'
import {throwError} from '../util/helpers.ts'


const allowedSidecars = ['xmp', 'icc', 'iptc', 'tiff']
const noop = () => {}

export async function sidecar(input, opts, segType) {
	let options = new Options(opts)
	options.chunked = false
	if (segType === undefined && typeof input === 'string')
		segType = guessTypeFromName(input)
	let chunk = await read(input, options)
	if (segType) {
		if (allowedSidecars.includes(segType))
			return handleSeg(segType, chunk, options)
		else
			throwError(`Invalid segment type`)
	} else {
		if (isXmpData(chunk))
			return handleSeg('xmp', chunk, options)
		for (let [type] of segmentParsers) {
			// skip unsupported sidecar types
			if (!allowedSidecars.includes(type)) continue
			// break the loop if parsing succeeded
			let output = await handleSeg(type, chunk, options).catch(noop)
			if (output) return output
		}
		throwError(`Unknown file format`)
	}
}

function isXmpData(chunk) {
	let string = chunk.getString(0, 50).trim()
	return string.includes('<?xpacket')
		|| string.includes('<x:')
}

async function handleSeg(type, chunk, options) {
	let segOptions = options[type]
	segOptions.enabled = true
	segOptions.parse = true
	let Parser = segmentParsers.get(type)
	return Parser.parse(chunk, segOptions)
}

function guessTypeFromName(filename) {
	let ext = filename.toLowerCase().split('.').pop()
	if (isTiffExt(ext)) return 'tiff'
	if (allowedSidecars.includes(ext)) return ext
}

function isTiffExt(ext) {
	return ext === 'exif'
		|| ext === 'tiff'
		|| ext === 'tif'
}