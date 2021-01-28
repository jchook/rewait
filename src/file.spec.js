const fs = require('fs')
const path = require('path')
const test = require('tape')
const file = require('./file')

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
  const fpath = path.join(__dirname, 'file.js')
  const result = await file(fpath)()
  t.ok(result instanceof fs.Stats, 'return value is file stat')
})
