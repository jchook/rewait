[rewait](../README.md) / sequence

# Function: sequence

▸ **sequence**<`T`\>(...`fns`): () => `Promise`<`any`[]\>

Perform a set of checks in sequence instead of in parallel.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`CheckFunction`](../interfaces/CheckFunction.md)[] |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...fns` | `T` |

#### Returns

`fn`

▸ (): `Promise`<`any`[]\>

##### Returns

`Promise`<`any`[]\>
