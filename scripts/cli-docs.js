// Write docs/cli.md from the compiled CLI help text, so the docs and
// `rewait --help` never drift apart. Run after `tsc`.
const fs = require('node:fs')
const path = require('node:path')
const { renderCliDocs } = require('../dist/cli/index.js')

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'cli.md'), renderCliDocs())
