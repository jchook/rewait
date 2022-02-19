# Function: socket

▸ **socket**(`dest`, `userOpts?`): () => `Promise`<`Socket`\>

Check that a socket is listening.

You can specify a full url (e.g. tcp://localhost:3000), a port number,
or an object of the form { host, port }. For IPC (Unix) sockets you can
pass a path to the socket.

#### Parameters

| Name | Type |
| :------ | :------ |
| `dest` | [`SocketConnectSpec`](../types/SocketConnectSpec.md) |
| `userOpts` | `Partial`<[`CheckSocketOptions`](../interfaces/CheckSocketOptions.md)\> |

#### Returns

`fn`

▸ (): `Promise`<`Socket`\>

##### Returns

`Promise`<`Socket`\>
