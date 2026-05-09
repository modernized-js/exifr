// @ts-nocheck — TS migration in progress; types will be added in a follow-up PR
import * as platform from '../util/platform.ts'
import {Buffer} from '../util/platform.ts'
import {Exifr} from '../Exifr.ts'
import {disableAllOptions} from './disableAllOptions.ts'


export const thumbnailOnlyOptions = Object.assign({}, disableAllOptions, {
	tiff: false,
	ifd1: true,
	// needed to prevent options from disabling ifd1
	mergeOutput: false
})


export async function thumbnail(input) {
	const exr = new Exifr(thumbnailOnlyOptions)
	await exr.read(input)
	const u8arr = await exr.extractThumbnail()
	if (u8arr && platform.hasBuffer)
		return Buffer.from(u8arr)
	else
		return u8arr
}

// only available in browser
export async function thumbnailUrl(input) {
	const u8arr = await this.thumbnail(input)
	if (u8arr !== undefined) {
		const blob = new Blob([u8arr]) // note: dont use AB directly, because of byteOffset
		return URL.createObjectURL(blob)
	}
}