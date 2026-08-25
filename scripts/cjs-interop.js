// Re-shape the compiled CommonJS modules so deep requires return the check
// function itself -- `require('rewait/http')` and the 1.x-era
// `require('rewait/src/http')` both yield a callable, as they did in 1.x --
// while `.default` and the named exports remain attached for bundlers,
// TypeScript, and Node ESM interop.
const fs = require('node:fs')
const path = require('node:path')

const dist = path.join(__dirname, '..', 'dist')

for (const file of fs.readdirSync(dist)) {
  if (!file.endsWith('.js') || file === 'index.js') continue
  const target = path.join(dist, file)
  const code = fs.readFileSync(target, 'utf8')
  if (!code.includes('exports.default')) continue
  if (code.includes('module.exports = Object.assign')) continue // idempotent
  fs.writeFileSync(
    target,
    `${code}\nmodule.exports = Object.assign(exports.default, exports)\n`
  )
}
