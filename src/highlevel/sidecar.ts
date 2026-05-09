import {segmentParsers} from '../plugins.ts'
import {Options} from '../options.ts'
import {read} from '../reader.ts'
import {throwError} from '../util/helpers.ts'


const allowedSidecars = ['xmp', 'icc', 'iptc', 'tiff']
const noop = () => {}

export async function sidecar(input, opts, segType) {
	const options = new Options(opts)
	options.chunked = false
	if (segType === undefined && typeof input === 'string')
		segType = guessTypeFromName(input)
	const chunk = await read(input, options)
	if (segType) {
		if (allowedSidecars.includes(segType))
			return handleSeg(segType, chunk, options)
		else
			throwError(`Invalid segment type`)
	} else {
		if (isXmpData(chunk))
			return handleSeg('xmp', chunk, options)
		for (const [type] of segmentParsers) {
			// skip unsupported sidecar types
			if (!allowedSidecars.includes(type)) continue
			// break the loop if parsing succeeded
			const output = await handleSeg(type, chunk, options).catch(noop)
			if (output) return output
		}
		throwError(`Unknown file format`)
	}
}

function isXmpData(chunk) {
	const string = chunk.getString(0, 50).trim()
	return string.includes('<?xpacket')
		|| string.includes('<x:')
}

async function handleSeg(type, chunk, options) {
	const segOptions = options[type]
	segOptions.enabled = true
	segOptions.parse = true
	const Parser = segmentParsers.get(type)
	return Parser.parse(chunk, segOptions)
}

function guessTypeFromName(filename) {
	const ext = filename.toLowerCase().split('.').pop()
	if (isTiffExt(ext)) return 'tiff'
	if (allowedSidecars.includes(ext)) return ext
}

function isTiffExt(ext) {
	return ext === 'exif'
		|| ext === 'tiff'
		|| ext === 'tif'
}