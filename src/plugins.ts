import {throwError} from './util/helpers.ts'


export function throwUnknown(kind, key) {
	throwError(`Unknown ${kind} '${key}'.`)
}

export function throwNotLoaded(kind, key) {
	throwError(`${kind} '${key}' was not loaded, try using full build of exifr.`)
}

class PluginList extends Map {

	declare kind: string

	constructor(kind: string) {
		super()
		this.kind = kind
	}

	// INVESTIGATE: move this check from runtime to options constructor
	get(key, options?) {
		if (!this.has(key))
			throwNotLoaded(this.kind, key)
		if (options) {
			if (!(key in options))
				throwUnknown(this.kind, key)
			if (!options[key].enabled)
				throwNotLoaded(this.kind, key)
		}
		return super.get(key)
	}

	keyList() {
		return Array.from(this.keys())
	}

}

export const fileParsers    = new PluginList('file parser')
export const segmentParsers = new PluginList('segment parser')
export const fileReaders    = new PluginList('file reader')