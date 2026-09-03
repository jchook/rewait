import fs from 'node:fs'
import path from 'node:path'
import test from 'tape'
import { flags } from '../../src/cli/flags.ts'
import { renderCliDocs, renderHelp } from '../../src/cli/help.ts'

test('docs/cli.md matches rewait --help', t => {
  const docs = fs.readFileSync(
    path.join(import.meta.dirname, '..', '..', 'docs', 'cli.md'),
    'utf8'
  )
  t.equal(
    docs,
    renderCliDocs(),
    'docs/cli.md is up to date (run `node scripts/cli-docs.js` to regenerate)'
  )
  t.end()
})

test('help text lists every option and fits in 80 columns', t => {
  const help = renderHelp()
  for (const flag of flags) {
    t.ok(help.includes(`--${flag.name}`), `mentions --${flag.name}`)
  }
  const wide = help.split('\n').filter(line => line.length > 80)
  t.deepEqual(wide, [], 'no line wider than 80 columns')
  t.end()
})
