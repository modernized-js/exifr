import {fileReaders} from '../plugins.ts'
import {ChunkedReader} from './ChunkedReader.ts'
import dynamicImport from '../util/import.ts'


const fsPromise = dynamicImport('fs', fs => fs.promises)

export class FsReader extends ChunkedReader {

	declare fs: any // eslint-disable-line @typescript-eslint/no-explicit-any
	declare fh: any // eslint-disable-line @typescript-eslint/no-explicit-any

	async readWhole() {
		this.chunked = false
		this.fs = await fsPromise
		const buffer = await this.fs.readFile(this.input)
		this._swapBuffer(buffer)
	}

	async readChunked() {
		this.chunked = true
		this.fs = await fsPromise
		await this.open()
		await this.readChunk(0, this.options.firstChunkSize)
	}

	async open() {
		if (this.fh === undefined) {
			this.fh = await this.fs.open(this.input, 'r')
			this.size = (await this.fh.stat(this.input)).size
		}
	}

	async _readChunk(offset, length) {
		// reopen if needed
		if (this.fh === undefined) await this.open()
		// stay within file-size boundaries
		if (offset + length > this.size)
			length = this.size - offset
		// read the chunk into newly created/extended chunk of the dynamic buffer.
		const chunk = this.subarray(offset, length, true)
		await this.fh.read(chunk.dataView, 0, length, offset)
		return chunk
	}

	// TODO: auto close file handle when reading and parsing is over
	// (app can read more chunks after parsing the first)
	async close() {
		if (this.fh) {
			const fh = this.fh
			this.fh = undefined
			await fh.close()
		}
	}

}

fileReaders.set('fs', FsReader)