import * as umd from '../../dist/full.umd.js'
import * as esm from '../../dist/full.esm.js'

const filePath = '../fixtures/img_1771.jpg'

;(async function() {
	const arrayBuffer = await fetch(filePath).then(res => res.arrayBuffer())
	const umdResult = await umd.parse(arrayBuffer)
	const esmResult = await esm.parse(arrayBuffer)
	if (window.testResult) window.testResult({umdResult, esmResult})
})()
