import {assert} from '../test-util-core.mjs'
import {getFile} from '../test-util-core.mjs'
import * as exifr from '../../src/bundles/full.ts'


describe('HEIC - HeicFileParser', () => {

	const options = {tiff: true, icc: true, mergeOutput: false, translateKeys: false, translateValues: false, reviveValues: false}

	const MAKE = 271
	const MODEL = 272

	it(`should not find anything in fixture1`, async () => {
		const input = await getFile('heic-single.heic')
		const output = await exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should not find anything in fixture2`, async () => {
		const input = await getFile('heic-collection.heic')
		const output = await exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should extract TIFF & ICC from fixture3`, async () => {
		const input = await getFile('heic-empty.heic')
		const output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.icc, 'output should contain ICC')
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
	})

	it(`should extract TIFF & ICC from fixture4`, async () => {
		const input = await getFile('heic-iphone.heic')
		const output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone XS Max')
	})

	it(`should extract TIFF & ICC from fixture5`, async () => {
		const input = await getFile('heic-iphone7.heic')
		const output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
	})

	it(`address of TIFF/EXIF from HEIC should align properly`, async () => {
		const input = await getFile('heic-iphone7.heic')
		const output = await exifr.parse(input, options)
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone 7')
	})

	it(`address of ICC from HEIC should align properly`, async () => {
		const input = await getFile('heic-iphone7.heic')
		const output = await exifr.parse(input, options)
		assert.equal(output.icc[4].toLowerCase(),  'appl') // ProfileCMMType
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
		assert.equal(output.icc[36], 'acsp') // ProfileFileSignature
		assert.equal(output.icc[40].toLowerCase(), 'appl') // PrimaryPlatform
	})

})