import http from 'http'
import fs from 'fs'
import * as rewait from 'rewait'

const tempFile = 'temp.txt'

function pause(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function createServer() {
  await pause(2000) // Artificially delay
  const server = http.createServer((_req, res) => {
    res.end()
  })
  server.listen(3000)
  console.log('Server online')
  return server
}

async function createFile() {
  await pause(1000)
  fs.writeFileSync(tempFile, 'Hello world')
  console.log('File created')
  return tempFile
}

async function awaitServerAndFile() {
  return await rewait.retry([
    rewait.http('http://localhost:3000/'),
    rewait.file(tempFile),
  ])
}

;(async () => {
  console.log(`Waiting for http://localhost:3000 and ${tempFile}`)
  const results = await Promise.all([
    awaitServerAndFile(),
    createServer(),
    createFile(),
  ])
  console.log('Done!')

  // Clean-up
  fs.rmSync(tempFile)
  results[1].close()
})()
