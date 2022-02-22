[rewait](../README.md) / retry

# Function: retry

▸ **retry**(`fn`, `userOptions?`): `Promise`<`any`\>

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

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | [`CheckFunction`](../interfaces/CheckFunction.md) \| [`CheckFunction`](../interfaces/CheckFunction.md)[] |
| `userOptions` | `Partial`<[`RetryOptions`](../interfaces/RetryOptions.md)\> |

#### Returns

`Promise`<`any`\>
