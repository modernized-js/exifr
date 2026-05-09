export * from './mini.ts'
import * as mini from './mini.ts'
export default mini


// File Readers
import '../file-readers/UrlFetcher.ts'
import '../file-readers/BlobReader.ts'

// File Parser
import '../file-parsers/jpeg.ts'
import '../file-parsers/heif.ts'

// TIFF Parser
import '../segment-parsers/tiff-exif.ts'

// TIFF Keys
import '../dicts/tiff-ifd0-keys.ts'
import '../dicts/tiff-exif-keys.ts'
import '../dicts/tiff-gps-keys.ts'

// TIFF Values
import '../dicts/tiff-ifd0-values.ts'
import '../dicts/tiff-exif-values.ts'

// TIFF Revivers
import '../dicts/tiff-revivers.ts'

// XMP
import '../segment-parsers/xmp.ts'