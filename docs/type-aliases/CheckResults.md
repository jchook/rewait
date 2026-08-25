[**rewait**](../README.md)

***

[rewait](../README.md) / CheckResults

# Type Alias: CheckResults\<T\>

> **CheckResults**\<`T`\> = `{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }`

Maps a tuple of check functions to a tuple of their awaited results,
e.g. [() => Promise<A>, () => B] becomes [A, B].

## Type Parameters

### T

`T` *extends* readonly [`CheckFunction`](CheckFunction.md)[]
