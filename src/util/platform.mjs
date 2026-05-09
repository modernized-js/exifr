import g from '../polyfill/global.mjs'

export const node = !!(typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node)
// Node 21+ exposes globalThis.navigator, so detect Node first and treat
// anything else as browser. Plain `typeof navigator !== 'undefined'`
// false-positives in modern Node and produces the wrong default
// firstChunkSize (browser 65536 instead of node 512).
export const browser = !node && typeof navigator !== 'undefined'
export const worker = browser && typeof HTMLImageElement === 'undefined'

// Needed for webpack. It otherwise packs 'buffer' npm module with the code
export const Buffer = g.Buffer
// Needed for ESLint. It doesn't yet support global BigInt.
export const BigInt = g.BigInt
export const hasBuffer = !!Buffer