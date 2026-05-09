import {assert, getFile, assertOutputWithoutErrors} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.ts'


export function testSegment({key, fileWith, fileWithout, definedByDefault, properties}) {

	if (definedByDefault) {
		it(`output.${key} is defined by default`, async () => {
			const options = {mergeOutput: false}
			const file = await getFile(fileWith)
			const output = await exifr.parse(file, options) || {}
			assert.isDefined(output[key])
		})
	} else {
		it(`output.${key} is undefined by default`, async () => {
			const options = {mergeOutput: false}
			const file = await getFile(fileWith)
			const output = await exifr.parse(file, options) || {}
			assert.isUndefined(output[key])
		})
	}

	it(`output.${key} is undefined when {${key}: false}`, async () => {
		const options = {mergeOutput: false, [key]: false}
		const file = await getFile(fileWith)
		const output = await exifr.parse(file, options) || {}
		assert.isUndefined(output[key])
	})

	if (fileWithout) {
		it(`output.${key} is undefined if the file doesn't contain the block`, async () => {
			const options = {mergeOutput: false, [key]: true}
			const file = await getFile(fileWithout)
			const output = await exifr.parse(file, options) || {}
			assert.isUndefined(output[key])
		})
	}

	it(`output.${key} is defined when {${key}: true}`, async () => {
		const options = {mergeOutput: false, [key]: true}
		const file = await getFile(fileWith)
		const output = await exifr.parse(file, options) || {}
		assert.isDefined(output[key])
	})

}


export function testMergeSegment({key, file, properties}) {
	describe('options.mergeOutput', () => {

		it(`mergeOutput:false keeps ${key} as separate object in output`, async () => {
			const options = {mergeOutput: false, [key]: true}
			const input = await getFile(file)
			const output = await exifr.parse(input, options) || {}
			assert.isDefined(output[key])
			for (const prop of properties)
				assert.isDefined(output[key][prop])
		})

		it(`mergeOutput:true combines ${key} properties into output`, async () => {
			const options = {mergeOutput: true, [key]: true}
			const input = await getFile(file)
			const output = await exifr.parse(input, options) || {}
			assert.isUndefined(output[key])
			for (const prop of properties)
				assert.isDefined(output[prop])
		})

	})
}


export function testSegmentTranslation({type, file, tags}) {

	describe('translation', () => {

		it(`should translate tag names to string by default`, async () => {
			const input = await getFile(file)
			const options = {mergeOutput: false, [type]: true}
			const output = await exifr.parse(input, options)
			const segment = output[type]
			assertOutputWithoutErrors(output)
			for (const [rawKey, translatedKey] of tags) {
				assert.isUndefined(segment[rawKey])
				assert.exists(segment[translatedKey])
			}
		})

		it(`should translate tag names to string when {translateKeys: true}`, async () => {
			const input = await getFile(file)
			const options = {mergeOutput: false, [type]: true, translateKeys: true}
			const output = await exifr.parse(input, options)
			const segment = output[type]
			assertOutputWithoutErrors(output)
			for (const [rawKey, translatedKey] of tags) {
				assert.isUndefined(segment[rawKey])
				assert.exists(segment[translatedKey])
			}
		})

		it(`should not translate tag names to string when {translateKeys: false}`, async () => {
			const input = await getFile(file)
			const options = {mergeOutput: false, [type]: true, translateKeys: false}
			const output = await exifr.parse(input, options)
			const segment = output[type]
			assertOutputWithoutErrors(output)
			for (const [rawKey, translatedKey] of tags) {
				assert.exists(segment[rawKey])
				assert.isUndefined(segment[translatedKey])
			}
		})

		if (Math.max(...tags.map(tag => tag.length)) > 2) {
			// some semgments don't need value translation (IPTC)

			it(`should translate tag values to string by default`, async () => {
				const input = await getFile(file)
				const options = {mergeOutput: false, [type]: true}
				const output = await exifr.parse(input, options)
				const segment = output[type]
				assertOutputWithoutErrors(output)
				for (const [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					const val = translatedValue || rawValue // this is to test non-translatable values
					if (val === undefined) continue
					assert.equal(segment[rawKey] || segment[translatedKey], val) //translatedValue)
				}
			})

			it(`should translate tag values to string when {translateValues: true}`, async () => {
				const input = await getFile(file)
				const options = {mergeOutput: false, [type]: true, translateValues: true}
				const output = await exifr.parse(input, options)
				const segment = output[type]
				assertOutputWithoutErrors(output)
				for (const [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					const val = translatedValue || rawValue // this is to test non-translatable values
					if (val === undefined) continue
					assert.equal(segment[rawKey] || segment[translatedKey], val) //translatedValue)
				}
			})

			it(`should not translate tag values to string when {translateValues: false}`, async () => {
				const input = await getFile(file)
				const options = {mergeOutput: false, [type]: true, translateValues: false}
				const output = await exifr.parse(input, options)
				const segment = output[type]
				assertOutputWithoutErrors(output)
				for (const [rawKey, translatedKey, rawValue] of tags) {
					assert.equal(segment[rawKey] || segment[translatedKey], rawValue)
				}
			})

			it(`should translate tag names & values by default`, async () => {
				const input = await getFile(file)
				const options = {mergeOutput: false, [type]: true}
				const output = await exifr.parse(input, options)
				const segment = output[type]
				assertOutputWithoutErrors(output)
				for (const [, translatedKey, rawValue, translatedValue] of tags) {
					const val = translatedValue || rawValue
					assert.equal(segment[translatedKey], val)
				}
			})

		}

	})

}

export function testTranslationInheritance(argument) {
	const {type, file, keyCode, keyName, valRaw, valTranslated, from} = argument

	it(`${type} inherits translateKeys from ${from}.translateKeys: true`, async () => {
		const options = Object.assign({mergeOutput: false, [type]: true}, argument.optionsTranslateKeysTrue)
		const output = await exifr.parse(await getFile(file), options)
		assert.isUndefined(output[type][keyCode])
		assert.isDefined(output[type][keyName])
	})

	it(`${type} inherits translateKeys from ${from}.translateKeys: false`, async () => {
		const options = Object.assign({mergeOutput: false, [type]: true}, argument.optionsTranslateKeysFalse)
		const output = await exifr.parse(await getFile(file), options)
		assert.isDefined(output[type][keyCode])
		assert.isUndefined(output[type][keyName])
	})

	if (valTranslated !== undefined) {
		it(`${type} inherits translateValues from ${from}.translateValues: true`, async () => {
			const options = Object.assign({mergeOutput: false, [type]: true}, argument.optionsTranslateValuesTrue)
			const output = await exifr.parse(await getFile(file), options)
			assert.equal(output[type][keyName], valTranslated)
		})
	}

	if (valRaw !== undefined) {
		it(`${type} inherits translateValues from ${from}.translateValues: false`, async () => {
			const options = Object.assign({mergeOutput: false, [type]: true}, argument.optionsTranslateValuesFalse)
			const output = await exifr.parse(await getFile(file), options)
			assert.equal(output[type][keyName], valRaw)
		})
	}
}

export function testGlobalFormatterInheritance(argument) {
	testTranslationInheritance({
		...argument,
		from: 'options',
		optionsTranslateKeysTrue:    {translateKeys: true},
		optionsTranslateKeysFalse:   {translateKeys: false},
		optionsTranslateValuesTrue:  {translateValues: true},
		optionsTranslateValuesFalse: {translateValues: false},
	})
}

export function testTiffFormatterInheritance(argument) {
	testTranslationInheritance({
		...argument,
		from: 'options.tiff',
		optionsTranslateKeysTrue:    {tiff: {translateKeys: true}},
		optionsTranslateKeysFalse:   {tiff: {translateKeys: false}},
		optionsTranslateValuesTrue:  {tiff: {translateValues: true}},
		optionsTranslateValuesFalse: {tiff: {translateValues: false}},
	})
}




export function testPickOrSkipTags(segKey, filePath, pick, skip) {
	describe('pick / skip', () => {

		it(`only tags from {pick: [...]} are in the output (global form)`, async () => {
			const file = await getFile(filePath)
			const options = {mergeOutput: false, [segKey]: true, pick}
			const output = await exifr.parse(file, options)
			const segment = output[segKey]
			if (segKey !== 'ifd1') {
				// this test is test suite is universal for all blocks but thumbnail is special
				// because it contains the same tags as ifd0 and thus may collide in this test case.
				// this is ok, not a problem. but this one test needs to take it into account
				assert.lengthOf(Object.keys(output), 1, `should only parse ${segKey} segment`)
			}
			assert.lengthOf(Object.keys(segment), pick.length)
			for (const tagKey of pick)
				assert.exists(segment[tagKey])
			//for (let tagKey of skip)
			//	assert.isUndefined(segment[tagKey])
		})

		it(`only tags from {${segKey}: [...]} are in the output[${segKey}] (shorthand array form)`, async () => {
			const file = await getFile(filePath)
			const options = {mergeOutput: false, [segKey]: pick}
			const output = await exifr.parse(file, options)
			const segment = output[segKey]
			assert.lengthOf(Object.keys(segment), pick.length)
			for (const tagKey of pick)
				assert.exists(segment[tagKey])
		})

		it(`only tags from {${segKey}: {pick: [...]}} are in the output[${segKey}] (full blown local object form)`, async () => {
			const file = await getFile(filePath)
			const options = {mergeOutput: false, [segKey]: {pick}}
			const output = await exifr.parse(file, options)
			const segment = output[segKey]
			for (const tagKey of pick)
				assert.exists(segment[tagKey])
		})

		it(`tags from {skip: [...]} are not in the output (global form)`, async () => {
			const file = await getFile(filePath)
			const options = {mergeOutput: false, [segKey]: true, skip}
			const output = await exifr.parse(file, options)
			const segment = output[segKey]
			for (const tagKey of pick)
				assert.exists(segment[tagKey])
			for (const tagKey of skip)
				assert.isUndefined(segment[tagKey])
		})

		it(`tags from {${segKey}: {skip: [...]}} are not in the output (full blown local object form)`, async () => {
			const file = await getFile(filePath)
			const options = {mergeOutput: false, [segKey]: {skip}}
			const output = await exifr.parse(file, options)
			const segment = output[segKey]
			for (const tagKey of pick)
				assert.exists(segment[tagKey])
			for (const tagKey of skip)
				assert.isUndefined(segment[tagKey])
		})

	})

}


export function testImage(segKey, filePath, results = {}) {
	it(`testing parsed properties against file ${filePath}`, async () => {
		const file = await getFile(filePath)
		const options = {mergeOutput: false, [segKey]: true}
		const output = await exifr.parse(file, options)
		const segment = output[segKey]
		assert.exists(segment, `output is undefined`)
		for (const [tagKey, tagVal] of Object.entries(results)) {
			assert.equal(segment[tagKey], tagVal)
		}
	})
}

export function testImageFull(filePath, results = {}) {
	it(`testing all parsed properties against file ${filePath}`, async () => {
		const file = await getFile(filePath)
		const output = await exifr.parse(file, true)
		for (const [tagKey, tagVal] of Object.entries(results)) {
			assert.equal(output[tagKey], tagVal)
		}
	})
}