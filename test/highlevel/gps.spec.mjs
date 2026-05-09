import {assert} from '../test-util-core.mjs'
import {getFile} from '../test-util-core.mjs'
import {Exifr} from '../../src/bundles/full.ts'
import * as exifr from '../../src/bundles/full.ts'
import {gpsOnlyOptions} from '../../src/highlevel/gps.ts'


describe('exifr.gps()', () => {

	let input
	before(async () => input = await getFile('IMG_20180725_163423.jpg'))

	describe('output', () => {

		it('returns latitue and logitude', async () => {
			const output = await exifr.gps(input)
			assert.exists(output.latitude)
			assert.exists(output.longitude)
		})

		it('returns only {latitue, logitude}', async () => {
			const output = await exifr.gps(input)
			assert.lengthOf(Object.keys(output), 2)
		})

	})

	describe('under the hood', () => {

		it('ifd0 only parses pointer to gps, gps only includess the necessary tags', async () => {
			const exr = new Exifr(gpsOnlyOptions)
			await exr.read(input)
			await exr.parse()
			assert.isBelow(exr.parsers.tiff.gps.size, 8)
			assert.lengthOf(exr.parsers.tiff.ifd0, 1)
		})

		it('other blocks are not parsed at all', async () => {
			const exr = new Exifr(gpsOnlyOptions)
			await exr.read(input)
			await exr.parse()
			assert.isUndefined(exr.parsers.tiff.exif)
			assert.isUndefined(exr.parsers.tiff.interop)
			assert.isUndefined(exr.parsers.tiff.thumbnail)
		})

	})

})