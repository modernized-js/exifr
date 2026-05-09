import {assert} from '../test-util-core.mjs'
import {getFile, getPath} from '../test-util-core.mjs'
import * as exifr from '../../src/bundles/full.ts'


assert.isError = (err, errMessage, debugMessage) => {
	assert.instanceOf(err, Error, debugMessage)
	if (errMessage) assert.equal(err.message, errMessage)
}

assert.catches = async (promise, debugMessage) => {
	let ok = false
	try {
		await promise
		ok = true
	} catch (err) {
		assert.isError(err, undefined, debugMessage)
	}
	if (ok) assert.fail(debugMessage)
}

describe('exifr.sidecar()', () => {

	describe('xmp', () => {

		it('infers xmp type from xmp extension', async () => {
			const input = getPath('sidecar/IMG_5910.xmp')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.isObject(output.aux)
		})

		it('infers xmp despite xml extension', async () => {
			const input = getPath('xmp5.xml')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
		})

		it('infers xmp type from xmp buffer', async () => {
			const input = await getFile('sidecar/IMG_5910.xmp')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.isObject(output.aux)
		})

		it('parses xmp if provided xmp type', async () => {
			const input = await getFile('sidecar/IMG_5910.xmp')
			const output = await exifr.sidecar(input, undefined, 'xmp')
			assert.isObject(output)
			assert.isObject(output.aux)
		})

		it('fails parsing xmp if provided incorrect type', async () => {
			const input = await getFile('sidecar/IMG_5910.xmp')
			const promise = exifr.sidecar(input, undefined, 'icc')
			await assert.catches(promise)
		})

		/*
		// doesnt work
		it('properly applies options', async () => {
			let input = getPath('sidecar/IMG_5910.xmp')
			let output = await exifr.sidecar(input, {mergeOutput: true})
            console.log('~ output', output)
			assert.isObject(output)
			assert.isUndefined(output.aux)
		})
		*/
	})

	describe('tiff', () => {

		it('infers tiff from tif extension', async () => {
			const input = getPath('fixtures/001.tif')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.exists(output.Model)
		})

		it('infers tiff despite exif extension', async () => {
			const input = getPath('sidecar/IMG_5910.exif')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.exists(output.Model)
		})

		it('infers tiff type from tiff buffer', async () => {
			const input = await getFile('sidecar/IMG_5910.exif')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.exists(output.Model)
		})

		it('parses tiff if provided tiff type', async () => {
			const input = await getFile('sidecar/IMG_5910.exif')
			const output = await exifr.sidecar(input, undefined, 'tiff')
			assert.isObject(output)
			assert.exists(output.Model)
		})

		it('fails parsing tiff if provided incorrect type', async () => {
			const input = await getFile('sidecar/IMG_5910.exif')
			const promise = exifr.sidecar(input, undefined, 'icc')
			await assert.catches(promise)
		})

	})

	describe('icc', () => {

		it('infers icc from tif extension', async () => {
			const input = getPath('icc/sRGB_v4_ICC_preference.icc')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.exists(output.ProfileVersion)
		})

		it('infers icc type from icc buffer', async () => {
			const input = await getFile('icc/sRGB_v4_ICC_preference.icc')
			const output = await exifr.sidecar(input)
			assert.isObject(output)
			assert.exists(output.ProfileVersion)
		})

		it('parses icc if provided icc type', async () => {
			const input = await getFile('icc/sRGB_v4_ICC_preference.icc')
			const output = await exifr.sidecar(input, undefined, 'icc')
			assert.isObject(output)
			assert.exists(output.ProfileVersion)
		})

		it('fails parsing icc if provided incorrect type (tiff)', async () => {
			const input = await getFile('icc/sRGB_v4_ICC_preference.icc')
			const promise = exifr.sidecar(input, undefined, 'tiff')
			await assert.catches(promise)
		})

		it('fails parsing icc if provided incorrect type (xmp)', async () => {
			const input = await getFile('icc/sRGB_v4_ICC_preference.icc')
			const output = await exifr.sidecar(input, undefined, 'xmp')
			assert.isUndefined(output)
		})

		it('properly applies options', async () => {
			const input = getPath('icc/sRGB_v4_ICC_preference.icc')
			const output = await exifr.sidecar(input, {translateKeys: false})
			assert.isObject(output)
			assert.isUndefined(output.ProfileVersion)
			assert.equal(output[8], '4.2.0')
		})

	})

})