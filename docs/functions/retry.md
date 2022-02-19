# Function: retry

▸ **retry**(`fn`, `userOptions?`): `Promise`<`any`\>

Wait for resources to become available, retrying at set invervals.

Note that retry() will not retry a given async check function until it
resolves. If it resolves faster than the interval, retry() will wait for
the balance of the interval time before retrying. The interval defaults to
250ms.

The timeout value throws an `Error` immediately after the given duration,
even if it has async processes still in progress. Defaults to Infinity.

The returned `Promise` only resolves once all supplied check functions pass.
It returns the result of all the check functions. If you passed in a single
function (not an array), it will return the result of that single function.

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | [`Fn`](../interfaces/Fn.md) \| [`Fn`](../interfaces/Fn.md)[] |
| `userOptions` | `Partial`<[`RetryOptions`](../interfaces/RetryOptions.md)\> |

#### Returns

`Promise`<`any`\>