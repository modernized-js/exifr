import {assert} from '../test-util-core.mjs'
import {getFile} from '../test-util-core.mjs'
import {Exifr} from '../../src/bundles/full.ts'


describe('JPEG - JpegFileParser', () => {

	describe('.findAppSegments()', () => {

		it(`finds APP segments existing in jpg file`, async () => {
			const input = await getFile('IMG_20180725_163423.jpg')
			const exr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exr.read(input)
			exr.setup()
			const jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			const jfifSegment = jpegFileParser.appSegments.find(segment => segment.type === 'jfif')
			assert.isDefined(jfifSegment)
			assert.equal(jfifSegment.offset, 25388)
			assert.equal(jfifSegment.length, 18)
			assert.equal(jfifSegment.start, 25397)
			assert.equal(jfifSegment.size, 9)
			assert.equal(jfifSegment.end, 25406)
			const tiffSegment = jpegFileParser.appSegments.find(segment => segment.type === 'tiff')
			assert.isDefined(tiffSegment)
		})

		it(`doesn't find segment not present in jpg file`, async () => {
			const input = await getFile('IMG_20180725_163423.jpg')
			const exr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exr.read(input)
			exr.setup()
			const jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			const xmpSegment = jpegFileParser.appSegments.find(segment => segment.type === 'xmp')
			assert.isUndefined(xmpSegment)
		})

		it(`multisegment ICC - finds all segments`, async () => {
			const input = await getFile('issue-metadata-extractor-65.jpg')
			const exr = new Exifr(true)
			await exr.read(input)
			exr.setup()
			const jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			const iccSegments = jpegFileParser.appSegments.filter(segment => segment.type === 'icc')
			assert.lengthOf(iccSegments, 9)
		})

	})

})