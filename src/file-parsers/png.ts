// @ts-nocheck — TS migration in progress; types will be added in a follow-up PR
import {FileParserBase} from '../parser.ts'
import {fileParsers, segmentParsers} from '../plugins.ts'
import * as platform from '../util/platform.ts'
import dynamicImport from '../util/import.ts'


const zlibPromise = dynamicImport('zlib')

// https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_PNG_files
// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html

const PNG_MAGIC_BYTES = '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a'

const PNG_XMP_PREFIX = 'XML:com.adobe.xmp'

const LENGTH_SIZE = 4
const TYPE_SIZE = 4
const CRC_SIZE = 4

const IHDR = 'ihdr'
const ICCP = 'iccp'
const TEXT = 'text'
const ITXT = 'itxt'
const EXIF = 'exif' // eXIf
const pngMetaChunks = [IHDR, ICCP, TEXT, ITXT, EXIF]

export class PngFileParser extends FileParserBase {

	static type = 'png'

	static canHandle(file, firstTwoBytes) {
		return firstTwoBytes === 0x8950
			&& file.getUint32(0) === 0x89504e47
			&& file.getUint32(4) === 0x0d0a1a0a
	}

	async parse() {
		const {file} = this
		await this.findPngChunksInRange(PNG_MAGIC_BYTES.length, file.byteLength)
		await this.readSegments(this.metaChunks)
		this.findIhdr()
		this.parseTextChunks()
		await this.findExif().catch(this.catchError)
		await this.findXmp().catch(this.catchError)
		await this.findIcc().catch(this.catchError)
	}

	catchError = err => this.errors.push(err)

	metaChunks = []
	unknownChunks = []

	async findPngChunksInRange(offset, end) {
		const {file} = this
		while (offset < end) {
			const size = file.getUint32(offset) // size without crc
			const marker = file.getUint32(offset + LENGTH_SIZE)
			const name = file.getString(offset + LENGTH_SIZE, 4)
			const type = name.toLowerCase()
			const start = offset + LENGTH_SIZE + TYPE_SIZE
			const length = size + LENGTH_SIZE + TYPE_SIZE + CRC_SIZE
			const seg = {type, offset, length, start, size, marker}
			if (pngMetaChunks.includes(type))
				this.metaChunks.push(seg)
			else
				this.unknownChunks.push(seg)
			offset += length
		}
	}

	// PNG additionally stores simple string key:value pairs each in separate tEXt chunks.
	// There can be many of them, the format is simple enough to not mandate custom segment-parser class.
	// For simplicity's and performance's sake. And these chunks do not specifically belong (like for example into iptc, exif, etc...)
	// So we're just parse it all here and merge the output into ihdr (rest of PNG header data).
	parseTextChunks() {
		const textChunks = this.metaChunks.filter(info => info.type === TEXT)
		for (const seg of textChunks) {
			const [key, val] = this.file.getString(seg.start, seg.size).split('\0')
			this.injectKeyValToIhdr(key, val)
		}
	}

	injectKeyValToIhdr(key, val) {
		const parser = this.parsers.ihdr
		if (parser) parser.raw.set(key, val)
	}

	findIhdr() {
		const seg = this.metaChunks.find(seg => seg.type === IHDR)
		if (!seg) return
		// ihdr option is undefined by default (because we don't want jpegs and heic files to pick it up)
		// so here we create it for every png file. But only if user didn't explicitly disabled it.
		if (this.options[IHDR].enabled !== false)
			this.createParser(IHDR, seg.chunk)
	}

	async findExif() {
		const seg = this.metaChunks.find(info => info.type === 'exif')
		if (!seg) return
		this.injectSegment('tiff', seg.chunk)
	}

	// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.iTXt
	// iTXt chunk header is slightly complicated. It contains multiple null-terminator-separated info.
	// The XMP data is present after third null-terminator.
	async findXmp() {
		const itxtChunks = this.metaChunks.filter(info => info.type === ITXT)
		for (const seg of itxtChunks) {
			const prefix = seg.chunk.getString(0, PNG_XMP_PREFIX.length)
			if (prefix === PNG_XMP_PREFIX)
				this.injectSegment('xmp', seg.chunk)
		}
	}

	async findIcc() {
		const seg = this.metaChunks.find(info => info.type === ICCP)
		if (!seg) return
		const {chunk} = seg
		const chunkHead = chunk.getUint8Array(0, 81)
		// icc profile has variable length (up to 80B) followed by null terminator.
		let nameLength = 0
		// Get length of the profile name by looking for the null terminator.
		while (nameLength < 80 && chunkHead[nameLength] !== 0) nameLength++
		// Recalculate actual ICC data position.
		const iccpHeaderLength = nameLength + 2 // 1 byte null terminator, + 1 byte compression
		const profileName = chunk.getString(0, nameLength)
		this.injectKeyValToIhdr('ProfileName', profileName)
		// ICC data is zlib compressed by default. Spec doesn't even allow raw data.
		if (platform.node) {
			const zlib = await zlibPromise
			let dataChunk = chunk.getUint8Array(iccpHeaderLength)
			dataChunk = zlib.inflateSync(dataChunk)
			this.injectSegment('icc', dataChunk)
		}
	}

}

fileParsers.set('png', PngFileParser)