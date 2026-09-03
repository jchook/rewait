#!/usr/bin/env node
const { run } = require('../dist/cli/index.js')
const { version } = require('../package.json')

run(process.argv.slice(2), {
  version,
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
}).then(
  code => process.exit(code),
  err => {
    process.stderr.write(`rewait: ${err?.stack ?? err}\n`)
    process.exit(1)
  }
)
