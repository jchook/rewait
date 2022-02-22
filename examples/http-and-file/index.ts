import { http, retry, file } from 'rewait'
import { createServerAndFile } from './util'

console.log(`Waiting for http://localhost:3000 and temp.txt`)
createServerAndFile()

retry([
  http('http://localhost:3000/'),
  file('temp.txt'),
]).then(() => {
  console.log('Ready!')
})

