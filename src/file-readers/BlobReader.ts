import {fileReaders} from '../plugins.ts'
import {readBlobAsArrayBuffer} from '../reader.ts'
import {ChunkedReader} from './ChunkedReader.ts'


export class BlobReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		const arrayBuffer = await readBlobAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	readChunked() {
		this.chunked = true
		this.size = this.input.size
		return super.readChunked()
	}

	async _readChunk(offset, length) {
		const end = length ? offset + length : undefined
		const blob = this.input.slice(offset, end)
		const abChunk = await readBlobAsArrayBuffer(blob)
		return this.set(abChunk, offset, true)
	}

}

fileReaders.set('blob', BlobReader)