[**rewait**](../README.md)

***

[rewait](../README.md) / retry

# Function: retry()

## Call Signature

> **retry**\<`T`\>(`fn`, `userOptions?`): `Promise`\<`Awaited`\<`ReturnType`\<`T`\>\>\>

Wait for resources to become available, retrying at set invervals.

Note that retry() will not retry a given async check function until it
settles. If it settles faster than the interval, retry() will wait for
the balance of the interval time before retrying. The interval defaults to
250ms.

The returned `Promise` only resolves once all supplied check functions pass.
It returns the result of all the check functions, similar to `Promise.all()`.
If you passed in a single function (not an array), it will return the result
of that single function.

The timeout controller throws a `MultiError` immediately after the timeout
duration, even if async processes continue to run. The error object contains
an `errors` property that holds the most recent position-wise errors (if
any) for the supplied check functions.

The timeout duration defaults to Infinity.

### Type Parameters

#### T

`T` *extends* [`CheckFunction`](../type-aliases/CheckFunction.md)

### Parameters

#### fn

`T`

#### userOptions?

`Partial`\<[`RetryOptions`](../interfaces/RetryOptions.md)\>

### Returns

`Promise`\<`Awaited`\<`ReturnType`\<`T`\>\>\>

## Call Signature

> **retry**\<`T`\>(`fn`, `userOptions?`): `Promise`\<[`CheckResults`](../type-aliases/CheckResults.md)\<`T`\>\>

Wait for resources to become available, retrying at set invervals.

Note that retry() will not retry a given async check function until it
settles. If it settles faster than the interval, retry() will wait for
the balance of the interval time before retrying. The interval defaults to
250ms.

The returned `Promise` only resolves once all supplied check functions pass.
It returns the result of all the check functions, similar to `Promise.all()`.
If you passed in a single function (not an array), it will return the result
of that single function.

The timeout controller throws a `MultiError` immediately after the timeout
duration, even if async processes continue to run. The error object contains
an `errors` property that holds the most recent position-wise errors (if
any) for the supplied check functions.

The timeout duration defaults to Infinity.

### Type Parameters

#### T

`T` *extends* readonly [`CheckFunction`](../type-aliases/CheckFunction.md)[]

### Parameters

#### fn

readonly \[`T`\]

#### userOptions?

`Partial`\<[`RetryOptions`](../interfaces/RetryOptions.md)\>

### Returns

`Promise`\<[`CheckResults`](../type-aliases/CheckResults.md)\<`T`\>\>
