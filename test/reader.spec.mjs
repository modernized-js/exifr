import {promises as fs} from 'fs'
import {assert} from './test-util-core.mjs'
import {isBrowser, isNode, getPath, getFile} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.ts'


export function createImg(url) {
	const img = document.createElement('img')
	img.src = url
	document.querySelector('#temp').append(img)
	return img
}

export async function createArrayBuffer(urlOrPath) {
	const bufferOrAb = await getFile(urlOrPath)
	if (bufferOrAb instanceof Uint8Array)
		return bufferOrAb.buffer
	else
		return bufferOrAb
}

export function createBlob(fileName) {
	return fetch(getPath(fileName)).then(res => res.blob())
}

export async function createObjectUrl(fileName) {
	return URL.createObjectURL(await createBlob(fileName))
}

export async function createBase64Url(fileName) {
	const url = getPath(fileName)
	if (isBrowser) {
		return new Promise(async (resolve, reject) => {
			const blob = await createBlob(url)
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(blob) 
		})
	} else if (isNode) {
		const buffer = await fs.readFile(url)
		return 'data:image/jpeg;base64,' + buffer.toString('base64')
	}
}

export function createWorker(input) {
	return new Promise((resolve, reject) => {
		const worker = new Worker('worker.mjs', { type: "module" })
		worker.postMessage(input)
		worker.onmessage = e => resolve(e.data)
		worker.onerror = err => reject('WebWorker onerror')
	})
}

describe('reader', () => {

	describe('input formats', () => {

		it(`ArrayBuffer`, async () => {
			const arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			const output = await exifr.parse(arrayBuffer)
			assert.isObject(output, `output is undefined`)
		})

		it(`DataView`, async () => {
			const arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			const dataView = new DataView(arrayBuffer)
			const output = await exifr.parse(dataView)
			assert.isObject(output, `output is undefined`)
		})

		it(`Uint8Array`, async () => {
			const arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			const uint8Array = new Uint8Array(arrayBuffer)
			const output = await exifr.parse(uint8Array)
			assert.isObject(output, `output is undefined`)
		})

		isNode && it(`Node: Buffer`, async () => {
			const buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
			const output = await exifr.parse(buffer)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Blob`, async () => {
			const blob = await createBlob('IMG_20180725_163423.jpg')
			const output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		isNode && it(`Node: string file path`, async () => {
			const path = getPath('IMG_20180725_163423.jpg')
			const output = await exifr.parse(path)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: string URL`, async () => {
			const url = getPath('IMG_20180725_163423.jpg')
			const output = await exifr.parse(url)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Object URL`, async () => {
			const blob = await createObjectUrl('IMG_20180725_163423.jpg')
			const output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		it(`Browser & Node: base64 URL`, async () => {
			const blob = await createBase64Url('IMG_20180725_163423.jpg')
			const output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with normal URL`, async () => {
			const img = createImg(getPath('IMG_20180725_163423.jpg'))
			const output = await exifr.parse(img)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with Object URL`, async () => {
			const img = createImg(await createObjectUrl('IMG_20180725_163423.jpg'))
			const output = await exifr.parse(img)
			assert.isObject(output, `output is undefined`)
		})

		describe('Browser: WebWoker', () => {

			isBrowser && it(`string URL`, async () => {
				const url = getPath('IMG_20180725_163423.jpg')
				const output = await createWorker(url)
				assert.isObject(output, `output is undefined`)
			})

			isBrowser && it(`ArrayBuffer`, async () => {
				const arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
				const output = await createWorker(arrayBuffer)
				assert.isObject(output, `output is undefined`)
			})

		})

	})

})
