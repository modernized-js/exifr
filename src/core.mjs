// Exports from the depths of the library
export {Exifr} from './Exifr.mjs'
// for advanced users
export * from './options.ts'
export {fileParsers, segmentParsers, fileReaders} from './plugins.mjs'
export {tagKeys, tagValues, tagRevivers, createDictionary, extendDictionary} from './tags.ts'
// undocumented, needed for demo page and tests
export {fetchUrlAsArrayBuffer, readBlobAsArrayBuffer} from './reader.mjs'

import {Exifr} from './Exifr.mjs'


export async function parse(input, options) {
	let exr = new Exifr(options)
	await exr.read(input)
	return exr.parse()
}
