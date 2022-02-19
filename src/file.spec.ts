import fs from 'fs'
import path from 'path'
import test from 'tape'
import file from './file'

test('file() fails when the file does not exist', async t => {
  t.plan(1)
  try {
    await file('non-existant.txt')()
  } catch (err) {
    t.ok(err, 'throws an exception')
  }
})

test('file() passes on a file that exists', async t => {
  t.plan(1)
  const fpath = path.join(__dirname, 'file.ts')
  const result = await file(fpath)()
  t.ok(result instanceof fs.Stats, 'return value is file stats')
})
