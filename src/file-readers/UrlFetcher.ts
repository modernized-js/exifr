import {fileReaders} from '../plugins.ts'
import {fetchUrlAsArrayBuffer} from '../reader.ts'
import {ChunkedReader} from './ChunkedReader.ts'


export class UrlFetcher extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		const chunk = (await fetchUrlAsArrayBuffer(this.input)) as ArrayBuffer | Uint8Array
		if (chunk instanceof ArrayBuffer)
			this._swapArrayBuffer(chunk)
		else if (chunk instanceof Uint8Array)
			this._swapBuffer(chunk)
	}

	async _readChunk(offset, length) {
		const end = length ? offset + length - 1 : undefined
		// note: end in http range is inclusive, unlike APIs in node,
		const headers = this.options.httpHeaders || {};
		if (offset || end) headers.range = `bytes=${[offset, end].join('-')}`
		const res = await fetch(this.input, {headers})
		const abChunk = await res.arrayBuffer()
		const bytesRead = abChunk.byteLength
		if (res.status === 416) return undefined
		if (bytesRead !== length) this.size = offset + bytesRead
		return this.set(abChunk, offset, true)
	}

}

fileReaders.set('url', UrlFetcher)