[**rewait**](../README.md)

***

[rewait](../README.md) / sequence

# Function: sequence()

> **sequence**\<`T`\>(...`fns`): () => `Promise`\<[`CheckResults`](../type-aliases/CheckResults.md)\<`T`\>\>

Perform a set of checks in sequence instead of in parallel.

## Type Parameters

### T

`T` *extends* readonly [`CheckFunction`](../type-aliases/CheckFunction.md)[]

## Parameters

### fns

...`T`

## Returns

() => `Promise`\<[`CheckResults`](../type-aliases/CheckResults.md)\<`T`\>\>
