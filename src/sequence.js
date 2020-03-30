module.exports = function sequence(...fns) {
  return async function () {
    const results = []
    for (let idx = 0; idx < fns.length; idx++) {
      results.push(await fns[idx]())
    }
    return results
  }
}
