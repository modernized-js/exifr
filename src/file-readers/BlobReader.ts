// @ts-nocheck — TS migration in progress; types will be added in a follow-up PR
import {fileReaders} from '../plugins.ts'
import {readBlobAsArrayBuffer} from '../reader.ts'
import {ChunkedReader} from './ChunkedReader.ts'


export class BlobReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await readBlobAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	readChunked() {
		this.chunked = true
		this.size = this.input.size
		return super.readChunked()
	}

	async _readChunk(offset, length) {
		let end = length ? offset + length : undefined
		let blob = this.input.slice(offset, end)
		let abChunk = await readBlobAsArrayBuffer(blob)
		return this.set(abChunk, offset, true)
	}

}

fileReaders.set('blob', BlobReader)