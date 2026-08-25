[**rewait**](../README.md)

***

[rewait](../README.md) / file

# Function: file()

> **file**(`path`, `userOpts?`): () => `Promise`\<`Stats`\>

Check for a file.

The default `checkOk` option only checks for the file's existence, but you
can pass in a different `checkOk` to examine other features such as the mode,
size, or owner/group.

## Parameters

### path

`string`

### userOpts?

`Partial`\<[`CheckFileOptions`](../interfaces/CheckFileOptions.md)\> = `{}`

## Returns

() => `Promise`\<`Stats`\>
