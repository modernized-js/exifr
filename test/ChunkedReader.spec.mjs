import {assert} from './test-util-core.mjs'
import {getPath, getUrl, getFile, isNode, isBrowser} from './test-util-core.mjs'
import {startStaticServer, stopStaticServer} from './test-util-core.mjs'
import {FsReader} from '../src/file-readers/FsReader.ts'
import {BlobReader} from '../src/file-readers/BlobReader.ts'
import {UrlFetcher} from '../src/file-readers/UrlFetcher.ts'
import {Base64Reader} from '../src/file-readers/Base64Reader.ts'
import {Exifr} from '../src/bundles/full.ts'
import {createBlob} from './reader.spec.mjs'
import {createBase64Url} from './reader.spec.mjs'


describe('ChunkedReader', () => {

	const file1 = {
		name: 'IMG_20180725_163423.jpg',
		size: 4055536,

		tiffOffset: 2,
		tiffLength: 25386,
		get tiffEnd() {return this.tiffOffset + this.tiffLength},

		iccOffset: 25406,
		iccLength: 614,
		get iccEnd() {return this.iccOffset + this.iccLength},

		jfifOffset: 25388,
		jfifLength: 18,
		get jfifEnd() {return this.jfifOffset + this.jfifLength},

		ifd0Pointer: 8,
		exifPointer: 239,
		gpsPointer:  18478,
	}

	const file2 = {
		name: 'noexif.jpg',
		size: 8318,
	}

	function testReaderClass(fileWrapper, ReaderClass) {

		const firstChunkSize = 10
		const options = {chunked: true, firstChunkSize}

		before(async () => {
			file1.input = await fileWrapper(file1.name)
			file2.input = await fileWrapper(file2.name)
		})

		it(`reads initial chunk`, async () => {
			const file = new ReaderClass(file1.input, {firstChunkSize})
			await file.readChunked()
			assert.equal(file.byteLength, firstChunkSize)
			assert.equal(file.getUint8(0), 0xFF)
			assert.equal(file.getUint8(1), 0xD8)
			if (file.close) await file.close()
		})

		describe('readChunked()', () => {

			it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
				const {input, tiffOffset, tiffLength} = file1
				const file = new ReaderClass(input, options)
				await file.readChunked()
				assert.equal(file.getUint8(0), 0xFF)
				assert.equal(file.getUint8(1), 0xD8)
				assert.equal(file.getUint8(2), 0xFF)
				assert.equal(file.getUint8(3), 0xE1)
				const tiffChunk = await file.readChunk(tiffOffset, tiffLength)
				assert.equal(file.getUint8(0), 0xFF)
				assert.equal(file.getUint8(1), 0xD8)
				assert.equal(file.getUint8(2), 0xFF)
				assert.equal(file.getUint8(3), 0xE1)
				assert.equal(file.getUint8(13), 0x49)
				assert.equal(file.getUint8(14), 0x2a)
				assert.equal(tiffChunk.getUint8(0), 0xFF)
				assert.equal(tiffChunk.getUint8(1), 0xE1)
				assert.equal(tiffChunk.getUint8(11), 0x49)
				assert.equal(tiffChunk.getUint8(12), 0x2a)
				if (file.close) await file.close()
			})

			it(`reading additional chunks keeps extending original view`, async () => {
				const {input, tiffOffset, tiffLength, tiffEnd, jfifOffset, jfifLength, jfifEnd} = file1
				const file = new ReaderClass(input, options)
				await file.readChunked()
				const tiffChunk = await file.readChunk(tiffOffset, tiffLength)
				assert.equal(tiffChunk.byteLength, tiffLength)
				assert.equal(file.byteLength, tiffEnd)
				const jfifChunk = await file.readChunk(jfifOffset, jfifLength)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(file.byteLength, jfifEnd)
				if (file.close) await file.close()
			})

			it(`reading sparsely creates second range`, async () => {
				const {input, jfifOffset, jfifLength, jfifEnd} = file1
				const file = new ReaderClass(input, options)
				await file.readChunked()
				assert.equal(file.ranges.list[0].end, firstChunkSize)
				assert.lengthOf(file.ranges.list, 1)
				const jfifChunk = await file.readChunk(jfifOffset, jfifLength)
				assert.equal(file.ranges.list[1].end, jfifOffset + jfifLength)
				assert.lengthOf(file.ranges.list, 2)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(file.byteLength, jfifEnd)
				if (file.close) await file.close()
			})
/*
			it(`space between sparse segments does not contain useful data`, async () => {
				let {input, jfifOffset, jfifLength, jfifEnd} = file1
				let file = new ReaderClass(input, options)
				let uint8view = file.toUint8()
				uint8view.fill(0)
				await file.readChunked()
				await file.readChunk(jfifOffset, jfifLength)
				assert.notEqual(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				if (file.close) await file.close()
			})
*/
			it(`reading beyond the end of file doesn't throw or malform the view`, async () => {
				const file = new ReaderClass(file1.input, options)
				await file.readChunked()
				const chunkSize = 20
				const chunk = await file.readChunk(file1.size - chunkSize, chunkSize * 2)
				assert.equal(chunk.byteLength, chunkSize)
				assert.equal(file.byteLength, file1.size)
				assert.equal(file.getUint32(file1.size - 4), 0xAC7FFFD9)
				if (file.close) await file.close()
			})

		})

		describe('readWhole()', () => {

			it(`space between segments contains useful data`, async () => {
				const {input, jfifOffset, size} = file1
				const file = new ReaderClass(input, options)
				await file.readWhole()
				assert.equal(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				assert.equal(file.getUint32(size - 4), 0xAC7FFFD9)
			})

			it(`fallback from firstChunk of chunked mode results in fully read file`, async () => {
				const {input, jfifOffset, size} = file1
				const file = new ReaderClass(input, options)
				await file.readChunked()
				await file.readWhole()
				assert.equal(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				assert.equal(file.getUint32(size - 4), 0xAC7FFFD9)
				await file.close()
			})

		})


		describe('synthetic chunk reading', () => {

			const options = {
				firstChunkSize: 10
			}

			it('read chunk 0-500 (out of 8318)', async () => {
				const offset = 0
				const length = 500
				const reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				const chunk = await reader.readChunk(offset, length)
				assert.equal(chunk.byteLength, length)
				await reader.close()
			})

			it('read chunk 8000-8500 (out of 8318)', async () => {
				const offset = 8000
				const length = 500
				const reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				const chunk = await reader.readChunk(offset, length)
				assert.isNumber(reader.size)
				assert.equal(chunk.byteLength, 318)
				await reader.close()
			})

			it('read chunk 8000-8500 & 8500-9000 (out of 8318) returns appropriate length', async () => {
				const length = 500
				const reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				const chunk1 = await reader.readChunk(8000, length)
				const chunk2 = await reader.readChunk(8500, length)
				assert.isNumber(reader.size)
				assert.equal(chunk1.byteLength, 318)
				assert.isUndefined(chunk2)
				await reader.close()
			})

			it('read chunk 9000-9500 (out of 8318) returns undefined', async () => {
				const offset = 9000
				const length = 500
				const reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				const chunk = await reader.readChunk(offset, length)
				assert.isUndefined(chunk)
				await reader.close()
			})

		})

		describe('runtime safe-checks', () => {

			it('.readNextChunk() returns false when last chunk was read', async () => {
				const chunkSize = 3000
				const reader = new ReaderClass(file2.input, {
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
				})
				await reader.readChunked()
				assert.equal(reader.byteLength, chunkSize * 1)
				const canKeepReading1 = await reader.readNextChunk()
				assert.isTrue(canKeepReading1)
				assert.equal(reader.byteLength, chunkSize * 2)
				const canKeepReading2 = await reader.readNextChunk()
				assert.isFalse(canKeepReading2)
				assert.equal(reader.byteLength, file2.size)
				assert.equal(reader.size, file2.size)
				await reader.close()
			})

			it('.nextChunkOffset tops up at file size', async () => {
				const chunkSize = 5000
				const reader = new ReaderClass(file2.input, {
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
				})
				await reader.readChunked()
				// we dont know the the file size yet so we fall back to defaut chunk size
				assert.equal(reader.nextChunkOffset, chunkSize)
				await reader.readNextChunk()
				assert.equal(reader.nextChunkOffset, file2.size)
				await reader.close()
			})

			it(`.chunksRead is 5 when reading ${file2.size} by chunkSize 2000 - only read necessary amount of chunks`, async () => {
				const chunkSize = 2000
				const exr = new Exifr({
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
					stopAfterSos: false, // disabled JPEG optimization
					iptc: true // NEEDED! this bypasses onlyTiff optimizatin which cuts off reading more chunks
				})
				await exr.read(file2.input)
				await exr.parse(file2.input)
				assert.equal(exr.file.chunksRead, 5)
				assert.equal(exr.file.size, file2.size)
				await exr.file.close()
			})

		})

	}




	isNode && describe('FsReader', () => {
		testReaderClass(getPath, FsReader)
	})

	isBrowser && describe('UrlFetcher', () => {
		testReaderClass(getPath, UrlFetcher)
	})
	if (isNode) {
		describe('UrlFetcher', {timeout: 10000}, () => {
			before(startStaticServer)
			after(stopStaticServer)
			testReaderClass(getUrl, UrlFetcher)
			it(`redirect`, async () => {
				const file = new UrlFetcher(getUrl('redirect'))
				await file.readWhole()
				assert.equal(file.getUint16(0), 0xFFD8)
			})
		})
	}


	isBrowser && describe('BlobReader', () => {
		testReaderClass(createBlob, BlobReader)
	})

	describe('Base64Reader', () => {

		testReaderClass(createBase64Url, Base64Reader)

		it(`'YWJj' readChunk() should return 'abc'`, async () => {
			const base64 = 'YWJj' //btoa('abc')
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk()
			assert.equal(chunk.byteLength, 3)
			assert.equal(chunk.getString(), 'abc')
		})
		it(`'YWJj' readChunk(0, 1) should return 'a'`, async () => {
			const base64 = 'YWJj' //btoa('abc')
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk(0, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'a')
		})
		it(`'YWJj' readChunk(1, 1) should return 'b'`, async () => {
			const base64 = 'YWJj' //btoa('abc')
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk(1, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'b')
		})
		it(`'YWJj' readChunk(1) should return 'bc'`, async () => {
			const base64 = 'YWJj' //btoa('abc')
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk(1)
			assert.equal(chunk.byteLength, 2)
			assert.equal(chunk.getString(), 'bc')
		})
		it(`'YWJjZGVmZ2hp' readChunk(3, 3) should return 'def'`, async () => {
			const base64 = 'YWJjZGVmZ2hp'
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk(3, 3)
			assert.equal(chunk.byteLength, 3)
			assert.equal(chunk.getString(), 'def')
		})
		it(`'YWJjZGVmZ2hp' readChunk(4, 1) should return 'e'`, async () => {
			const base64 = 'YWJjZGVmZ2hp'
			const reader = new Base64Reader(base64, {})
			const chunk = await reader.readChunk(4, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'e')
		})
	})

	it(`should read file sequentially`, async () => {
		const {name, tiffOffset, tiffLength, tiffEnd} = file1
		const firstChunkSize = tiffOffset + Math.round(tiffLength / 2)
		const options = {chunked: true, firstChunkSize, mergeOutput: false, exif: true, gps: true}
		const exr = new Exifr(options)
		await exr.read(getPath(name))
		assert.equal(exr.file.byteLength, firstChunkSize)
		assert.equal(exr.file.ranges.list[0].end, firstChunkSize)
		await exr.parse()
		assert.isAtLeast(exr.file.byteLength, tiffEnd)
		assert.isAtLeast(exr.file.ranges.list[0].end, tiffEnd)
		await exr.file.close()
	})

	it(`should only read one chunk if firstChunkSize sufficiently contains the wanted segment (TIFF)`, async () => {
		const {name, tiffOffset, tiffLength, tiffEnd} = file1
		const firstChunkSize = tiffOffset + tiffLength
		const options = {chunked: true, firstChunkSize, tiff: true}
		const exr = new Exifr(options)
		await exr.read(getPath(name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, 1)
		assert.isAtLeast(exr.file.byteLength, tiffEnd)
	})

	it(`should only read one chunk if firstChunkSize sufficiently contains the wanted segment (ICC)`, async () => {
		const {name, iccOffset, iccLength} = file1
		const firstChunkSize = iccOffset + iccLength
		const options = {chunked: true, firstChunkSize, icc: true}
		const exr = new Exifr(options)
		await exr.read(getPath(name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, 1)
	})

	it(`should read two chunks if firstChunkSize does not fully contain the wanted segment (TIFF)`, async () => {
		const {name, tiffOffset, tiffLength, tiffEnd} = file1
		const firstChunkSize = tiffOffset + Math.round(tiffLength / 2)
		const options = {chunked: true, firstChunkSize, mergeOutput: false, tiff: true}
		const exr = new Exifr(options)
		await exr.read(getPath(name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, 2)
		assert.isAtLeast(exr.file.byteLength, tiffEnd)
	})

	it(`should read two chunks if firstChunkSize does not fully contain the wanted segment (ICC)`, async () => {
		const {name, iccOffset, iccLength, iccEnd} = file1
		const firstChunkSize = iccOffset + Math.round(iccLength / 2)
		const options = {chunked: true, firstChunkSize, mergeOutput: false, icc: true}
		const exr = new Exifr(options)
		await exr.read(getPath(name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, 2)
		assert.isAtLeast(exr.file.byteLength, iccEnd)
	})

	it(`should only read one chunk if only TIFF is wanted, when parsing file without exif`, async () => {
		const chunkSize = 1000
		const options = {chunked: true, tiff: true, icc: false, iptc: false, xmp: false, jfif: false, firstChunkSize: chunkSize, chunkSize, stopAfterSos: false}
		const exr = new Exifr(options)
		await exr.read(getPath(file2.name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, 1)
	})

	it(`reads up to 'chunkLimit' chunks if more than TIFF is wanted, when parsing file without exif`, async () => {
		const chunkSize = 1000
		const chunkLimit = 4
		const options = {chunked: true, tiff: true, icc: false, iptc: true, xmp: false, jfif: false, firstChunkSize: chunkSize, chunkSize, chunkLimit, stopAfterSos: false}
		const exr = new Exifr(options)
		await exr.read(getPath(file2.name))
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.file.chunksRead, chunkLimit)
	})

	/*
	issue-metadata-extractor-65.jpg 567kb
	√ tiff     | offset       2 | length    4321 | end    4323 | <Buffer ff e1 10 df 45 78 69 66 00 00 4d 4d 00 2a>
	√ iptc     | offset    4323 | length    6272 | end   10595 | <Buffer ff ed 18 7e 50 68 6f 74 6f 73 68 6f 70 20>
	√ xmp      | offset   10595 | length    3554 | end   14149 | <Buffer ff e1 0d e0 68 74 74 70 3a 2f 2f 6e 73 2e>
	√ icc      | offset   14149 | length   65508 | end   79657 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset   79657 | length   65508 | end  145165 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  145165 | length   65508 | end  210673 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  210673 | length   65508 | end  276181 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  276181 | length   65508 | end  341689 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  341689 | length   65508 | end  407197 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  407197 | length   65508 | end  472705 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  472705 | length   65508 | end  538213 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  538213 | length   33266 | end  571479 | <Buffer ff e2 81 f0 49 43 43 5f 50 52 4f 46 49 4c>
	? Adobed   | offset  571479 | length      16 | end  571495 | <Buffer ff ee 00 0e 41 64 6f 62 65 00 64 00 00 00>
	*/
	it(`file with multisegment ICC - should read only first segment when {multiSegment: undefined}`, async () => {
		const input = await getPath('issue-metadata-extractor-65.jpg')
		const exr = new Exifr({tiff: false, icc: true, firstChunkSize: 14149  + 100})
		await exr.read(input)
		await exr.parse()
		await exr.file.close()
        assert.equal(exr.fileParser.appSegments.length, 1, 'Should only read the first out of 9 ICC segments')
	})

	it(`file with multisegment ICC - should read all segments when {multiSegment: true}`, async () => {
		const input = await getPath('issue-metadata-extractor-65.jpg')
		const exr = new Exifr({tiff: false, icc: true, firstChunkSize: 14149  + 100, multiSegment: true})
		await exr.read(input)
		await exr.parse()
		await exr.file.close()
		assert.equal(exr.fileParser.appSegments.length, 9, 'Should find all 9 ICC segments')
	})

	it(`file with segment header split between chunks (markers at 510-512, length at 512-514, firstChunkSize: 512)`, async () => {
		const input = await getPath('door-knocker.jpg')
		const options = {
			chunked: true,
			// some segment starts at 510. since header is 4 bytes long, it spans to next chunk.
			firstChunkSize: 512,
			// this just causes jpeg segment parser to keep looking
			xmp: true
		}
		const exr = new Exifr(options)
		await exr.read(input)
		const output = await exr.parse()
		await exr.file.close()
		assert.equal(output.Make, 'OLYMPUS IMAGING CORP.')
	})

	describe(`001.tif - reading scattered (IFD0 pointing to the end of file)`, async () => {

		it(`input path & {chunked: true, firstChunkSize: 100}`, async () => {
			const input = await getPath('001.tif')
			const options = {chunked: true, firstChunkSize: 100}
			const exr = new Exifr(options)
			await exr.read(input)
			const output = await exr.parse()
			await exr.file.close()
			assert.equal(output.Make, 'DJI')
		})

		it(`input path & {chunked: true}`, async () => {
			const input = await getPath('001.tif')
			const options = {chunked: false}
			const exr = new Exifr(options)
			await exr.read(input)
			const output = await exr.parse()
			await exr.file.close()
			assert.equal(output.Make, 'DJI')
		})

		it(`input buffer & no options`, async () => {
			const input = await getFile('001.tif')
			const exr = new Exifr()
			await exr.read(input)
			const output = await exr.parse()
			assert.equal(output.Make, 'DJI')
		})

	})

	describe('reads file with small firstChunkSize', () => {

		describe(`small file (32kb)`, async () => {
			testChunkedFile('tif-with-iptc-icc-xmp.tif', ['exif', 'xmp', 'iptc', 'icc'])
		})

		describe(`regular files`, async () => {
			testChunkedFile('001.tif', ['exif', 'xmp'])
			testChunkedFile('002.tiff', ['exif', 'xmp'])
			testChunkedFile('issue-exif-js-124.tiff', ['exif', 'xmp'])
			testChunkedFile('issue-metadata-extractor-152.tif', ['exif', 'xmp'])
		})

		function testChunkedFile(fileName, segKeys) {

			it(`reads fixture ${fileName} with default settings`, async () => {
				const input = await getPath(fileName)
				const options = {chunked: true, mergeOutput: false, firstChunkSize: 100}
				const exr = new Exifr(options)
				await exr.read(input)
				const output = await exr.parse()
				await exr.file.close()
				assert.isObject(output)
			})

			it(`reads fixture ${fileName} with all segments enabled`, async () => {
				const input = await getPath(fileName)
				const options = {chunked: true, mergeOutput: false, firstChunkSize: 100, xmp: true, icc: true, iptc: true}
				const exr = new Exifr(options)
				await exr.read(input)
				const output = await exr.parse()
				await exr.file.close()
				assert.isObject(output)
			})

			if (segKeys) {

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')} (chunked)`, async () => {
					const input = await getPath(fileName)
					const options = {chunked: true, mergeOutput: false, firstChunkSize: 100}
					for (const segKey of segKeys) options[segKey] = true
					if (options.xmp) options.xmp = {parse: false} // exception for the way XMP parser works with namespaces
					const exr = new Exifr(options)
					await exr.read(input)
					const output = await exr.parse()
					await exr.file.close()
					assert.isObject(output)
					for (const segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

				// test to compare with
				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')} (whole file)`, async () => {
					const input = await getFile(fileName)
					const options = {mergeOutput: false, firstChunkSize: 100}
					for (const segKey of segKeys) options[segKey] = true
					if (options.xmp) options.xmp = {parse: false} // exception for the way XMP parser works with namespaces
					const exr = new Exifr(options)
					await exr.read(input)
					const output = await exr.parse()
					assert.isObject(output)
					for (const segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

			}

		}

	})

})
