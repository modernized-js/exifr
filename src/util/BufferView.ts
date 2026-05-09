import {throwError} from './helpers.ts'
import {hasBuffer} from '../util/platform.ts'


const arrayToCharCode = arr => String.fromCharCode.apply(null, arr)

const utf8decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : undefined

export function uint8ArrayToUtf8String(uint8array) {
	if (utf8decoder)
		return utf8decoder.decode(uint8array)
	else if (hasBuffer)
		return Buffer.from(uint8array).toString('utf8')
	else
		return decodeURIComponent(escape(arrayToCharCode(uint8array)))
}

// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
//       we can safely use it along with TextDecoder API.
export function toAsciiString(arg) {
	if (typeof arg !== 'string')
		return uint8ArrayToUtf8String(arg)
	else
		return arg
}

export class BufferView {

	// Explicit field declarations so subclasses (DynamicBufferView,
	// ChunkedReader) can access them without TS complaining. Use `declare`
	// to keep them type-only — actual assignments happen in the constructor
	// / _swapDataView, and class-field initializers would otherwise overwrite
	// values set by subclasses.
	declare le?: boolean
	declare dataView: DataView
	declare buffer: ArrayBuffer
	declare byteOffset: number
	declare byteLength: number

	// Augmentation: BufferView-get64.ts attaches getUint64 to the prototype.
	declare getUint64?: (offset: number, le?: boolean) => number | bigint

	static from(arg, le?) {
		if (arg instanceof this && arg.le === le)
			return arg
		else
			return new BufferView(arg, undefined, undefined, le)
	}

	constructor(arg, offset = 0, length?, le?) {
		if (typeof le === 'boolean') this.le = le
		if (Array.isArray(arg)) arg = new Uint8Array(arg)
		if (arg === 0) {
			this.byteOffset = 0
			this.byteLength = 0
		} else if (arg instanceof ArrayBuffer) {
			if (length === undefined) length = arg.byteLength - offset
			const dataView = new DataView(arg, offset, length)
			this._swapDataView(dataView)
		} else if (arg instanceof Uint8Array || arg instanceof DataView || arg instanceof BufferView) {
			// Node.js Buffer is also instance of Uint8Array, but small ones are backed
			// by single large ArrayBuffer pool, so we always need to check for arg.byteOffset.
			if (length === undefined) length = arg.byteLength - offset
			offset += arg.byteOffset
			if (offset + length > arg.byteOffset + arg.byteLength)
				throwError('Creating view outside of available memory in ArrayBuffer')
			const dataView = new DataView(arg.buffer, offset, length)
			this._swapDataView(dataView)
		} else if (typeof arg === 'number') {
			const dataView = new DataView(new ArrayBuffer(arg))
			this._swapDataView(dataView)
		} else {
			throwError('Invalid input argument for BufferView: ' + arg)
		}
	}

	_swapArrayBuffer(arrayBuffer) {
		this._swapDataView(new DataView(arrayBuffer))
	}

	_swapBuffer(uint8) {
		this._swapDataView(new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength))
	}

	_swapDataView(dataView) {
		this.dataView   = dataView
		this.buffer     = dataView.buffer
		this.byteOffset = dataView.byteOffset
		this.byteLength = dataView.byteLength
	}

	_lengthToEnd(offset) {
		return this.byteLength - offset
	}

	set(arg, offset, Class = BufferView) {
		if (arg instanceof DataView || arg instanceof BufferView)
			arg = new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength)
		else if (arg instanceof ArrayBuffer)
			arg = new Uint8Array(arg)
		if (!(arg instanceof Uint8Array))
			throwError(`BufferView.set(): Invalid data argument.`)
		const uintView = this.toUint8()
		uintView.set(arg, offset)
		return new Class(this, offset, arg.byteLength)
	}

	// Use this to get BufferView of specific subset of this BufferView.
	subarray(offset, length) {
		length = length || this._lengthToEnd(offset)
		return new BufferView(this, offset, length)
	}

	// Use this for working with the same memory.
	// Returns Uint8Array view over the same memory of ArrayBuffer as the internal DataView.
	toUint8() {
		return new Uint8Array(this.buffer, this.byteOffset, this.byteLength)
	}

	// Use this for reading data.
	// Returns Uint8Array from given point in the chunk. Properly start at the begining of the chunk,
	// regardles of where the chunk is in the ArrayBuffer.
	getUint8Array(offset, length) {
		return new Uint8Array(this.buffer, this.byteOffset + offset, length)
	}

	getString(offset = 0, length = this.byteLength) {
		const arr = this.getUint8Array(offset, length)
		return uint8ArrayToUtf8String(arr)
	}

	getLatin1String(offset = 0, length = this.byteLength) {
		const arr = this.getUint8Array(offset, length)
		return arrayToCharCode(arr)
	}

	// TODO: refactor
	getUnicodeString(offset = 0, length = this.byteLength) {
		// cannot use Uint16Array because it uses the other fucking endian order.
		const chars: number[] = []
		for (let i = 0; i < length && offset + i < this.byteLength; i += 2)
			chars.push(this.getUint16(offset + i))
		return arrayToCharCode(chars)
	}

	getInt8(offset)                  {return this.dataView.getInt8(offset)}
	getUint8(offset)                 {return this.dataView.getUint8(offset)}
	getInt16(offset,   le = this.le) {return this.dataView.getInt16(offset, le)}
	getInt32(offset,   le = this.le) {return this.dataView.getInt32(offset, le)}
	getUint16(offset,  le = this.le) {return this.dataView.getUint16(offset, le)}
	getUint32(offset,  le = this.le) {return this.dataView.getUint32(offset, le)}
	getFloat32(offset, le = this.le) {return this.dataView.getFloat32(offset, le)}
	getFloat64(offset, le = this.le) {return this.dataView.getFloat64(offset, le)}
	getFloat(offset,   le = this.le) {return this.dataView.getFloat32(offset, le)}
	getDouble(offset,  le = this.le) {return this.dataView.getFloat64(offset, le)}


	// todo: investiage - can this be removed?
	getUintBytes(offset, bytes, le?) {
		switch (bytes) {
			case 1: return this.getUint8(offset)
			case 2: return this.getUint16(offset, le)
			case 4: return this.getUint32(offset, le)
			// Extension only required for parsing HEIC, implemented in separate file.
			case 8: return this.getUint64 && this.getUint64(offset, le)
		}
	}

	// todo: investiage - can this be removed?
	getUint(offset, size, le?) {
		switch (size) {
			case 8:  return this.getUint8(offset)
			case 16: return this.getUint16(offset, le)
			case 32: return this.getUint32(offset, le)
			// Extension only required for parsing HEIC, implemented in separate file.
			case 64: return this.getUint64 && this.getUint64(offset, le)
		}
	}

	// do not delete
	ensureChunk(_offset?: number, _length?: number): unknown { return undefined }

}