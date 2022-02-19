import fs from 'fs'
import path from 'path'
import test from 'tape'
import file from '../src/file'

test('file() fails when the file does not exist', async t => {
  t.plan(2)
  try {
    await file('non-existant.txt')()
  } catch (err) {
    t.ok(err instanceof Error, 'throws an exception')
    if (err instanceof Error) {
      t.match(err.message, /ENOENT/, 'ENOENT')
    }
  }
})

test('file() passes on a file that exists', async t => {
  t.plan(1)
  const fpath = path.join(__dirname, 'file.spec.ts')
  const result = await file(fpath)()
  t.ok(result instanceof fs.Stats, 'return value is file stats')
})
