# Interface: CheckHttpOptions

Options for the checkHttp() function

## Table of contents

### Properties

- [bail](CheckHttpOptions.md#bail)
- [data](CheckHttpOptions.md#data)
- [flowingMode](CheckHttpOptions.md#flowingmode)
- [requestOptions](CheckHttpOptions.md#requestoptions)
- [timeout](CheckHttpOptions.md#timeout)

### Methods

- [checkOk](CheckHttpOptions.md#checkok)
- [onError](CheckHttpOptions.md#onerror)
- [onRequest](CheckHttpOptions.md#onrequest)
- [onResponse](CheckHttpOptions.md#onresponse)

## Properties

### bail

• `Optional` **bail**: `boolean`

Instantly destroy the request as soon as it connects?
This can save time when the response is large or takes time to send.

___

### data

• `Optional` **data**: `any`

Data to write to the HTTP(S) request stream

___

### flowingMode

• `Optional` **flowingMode**: `boolean`

Whether to put the response stream into "flowing mode" automatically. If
you set this to false, you may need to call res.resume() manually in the
request's response callback.

___

### requestOptions

• `Optional` **requestOptions**: `RequestOptions`

Node HTTP request options.
Note: The `timeout` option is for connect time only.

___

### timeout

• **timeout**: `number`

Total request time timeout, in milliseconds

## Methods

### checkOk

▸ **checkOk**(`res`, `opts`): `void` \| `Promise`<`any`\>

Check whether a response is OK

#### Parameters

| Name | Type |
| :------ | :------ |
| `res` | `IncomingMessage` |
| `opts` | [`CheckHttpOptions`](CheckHttpOptions.md) |

#### Returns

`void` \| `Promise`<`any`\>

___

### onError

▸ `Optional` **onError**(`err`, `opts`): `void`

Callback to handle request error

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `opts` | [`CheckHttpOptions`](CheckHttpOptions.md) |

#### Returns

`void`

___

### onRequest

▸ `Optional` **onRequest**(`req`, `opts`): `void`

Callback to handle a successful request

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ClientRequest` |
| `opts` | [`CheckHttpOptions`](CheckHttpOptions.md) |

#### Returns

`void`

___

### onResponse

▸ `Optional` **onResponse**(`req`, `opts`): `void`

Callback to handle a response

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `IncomingMessage` |
| `opts` | [`CheckHttpOptions`](CheckHttpOptions.md) |

#### Returns

`void`
