import http from 'http'
import fs from 'fs'

export const tempFile = 'temp.txt'

let httpServer: http.Server | undefined = undefined

export function pause(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

export async function createServer() {
  await pause(2000) // Artificially delay
  const server = http.createServer((_req, res) => {
    res.end()
  })
  server.listen(3000)
  httpServer = server
  console.log('Server online')
  return server
}

export async function createFile() {
  await pause(1000) // Artificial delay
  fs.writeFileSync(tempFile, 'Hello world')
  console.log('File created')
  return tempFile
}

export function cleanUp() {
  fs.rmSync(tempFile)
  if (httpServer && httpServer.listening) {
    httpServer.close()
  }
}

export async function createServerAndFile() {
  try {
    await Promise.all([createServer(), createFile()])
    await pause(500)
  } catch (err) {
    console.error(err)
  } finally {
    cleanUp()
  }
}
