export * from './lite.mjs'
import * as lite from './lite.mjs'
export default lite


// Highlevel API: parseSidecar()
export * from '../highlevel/sidecar.mjs'

// File Readers
import '../file-readers/FsReader.ts'
import '../file-readers/Base64Reader.ts'

// File Parsers
import '../file-parsers/tiff.ts'
import '../file-parsers/heif.ts'
import '../file-parsers/png.ts'

// TIFF - Additional tags
import '../dicts/tiff-interop-keys.ts'
import '../dicts/tiff-other-keys.ts'
import '../dicts/tiff-gps-values.ts'

// JFIF (JPEG header)
import '../segment-parsers/jfif.mjs'
import '../dicts/jfif-keys.ts'

// IHDR (PNG header)
import '../segment-parsers/ihdr.mjs'
import '../dicts/ihdr-keys.ts'
import '../dicts/ihdr-values.ts'

// ICC
import '../segment-parsers/icc.mjs'
import '../dicts/icc-keys.ts'
import '../dicts/icc-values.ts'

// IPTC
import '../segment-parsers/iptc.mjs'
import '../dicts/iptc-keys.ts'
import '../dicts/iptc-values.ts'