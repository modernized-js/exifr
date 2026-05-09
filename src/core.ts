// Exports from the depths of the library
export {Exifr} from './Exifr.ts'
// for advanced users
export * from './options.ts'
export {fileParsers, segmentParsers, fileReaders} from './plugins.ts'
export {tagKeys, tagValues, tagRevivers, createDictionary, extendDictionary} from './tags.ts'
// undocumented, needed for demo page and tests
export {fetchUrlAsArrayBuffer, readBlobAsArrayBuffer} from './reader.ts'

import {Exifr} from './Exifr.ts'


export async function parse(input, options) {
	let exr = new Exifr(options)
	await exr.read(input)
	return exr.parse()
}
