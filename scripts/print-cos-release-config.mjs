import { resolveCOSReleaseConfig } from './cos-release-config.mjs'

const config = resolveCOSReleaseConfig(process.argv[2], process.argv[3] || 'dn-wails')
process.stdout.write(JSON.stringify(config))
