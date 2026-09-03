[**rewait**](../README.md)

***

[rewait](../README.md) / CheckHttpOptions

# Interface: CheckHttpOptions

Options for the checkHttp() function

## Properties

### auth?

> `optional` **auth?**: [`AuthCredentials`](AuthCredentials.md)

Automatically encodes supplied credentials and attaches them to
requestOptions.

***

### bail?

> `optional` **bail?**: `boolean`

Destroy the request as soon as `checkOk` has run, without waiting for the
rest of the response body. This can save time when the response is large
or takes time to send.

***

### baseUrl?

> `optional` **baseUrl?**: `URL`

The "base URL" to use when constructing the URL (2nd arg to new URL())

***

### checkOk

> **checkOk**: (`res`, `opts`) => `any`

Check whether a response is OK. Throw an Error to indicate a not-ok state.

Called as soon as response headers arrive, with the body still unread, so
the check may consume the stream, e.g. via [checkHttpResponse](../functions/checkHttpResponse.md).
Whatever is left of the body is drained after the check returns.

#### Parameters

##### res

`IncomingMessage`

##### opts

`CheckHttpOptions`

#### Returns

`any`

***

### connectTimeout?

> `optional` **connectTimeout?**: `number`

Alias for requestOptions.timeout, in milliseconds.

***

### data?

> `optional` **data?**: `any`

Data to write to the HTTP(S) request stream

***

### flowingMode?

> `optional` **flowingMode?**: `boolean`

Whether to drain the response stream automatically after `checkOk` runs.
If you set this to false you must consume the stream yourself, e.g. in
`checkOk` or `onResponse`, or the check will hang until it times out.

***

### onError?

> `optional` **onError?**: (`err`, `opts`) => `void`

Callback to handle request error

#### Parameters

##### err

`Error`

##### opts

`CheckHttpOptions`

#### Returns

`void`

***

### onRequest?

> `optional` **onRequest?**: (`req`, `opts`) => `void`

Callback to handle a successful request

#### Parameters

##### req

`ClientRequest`

##### opts

`CheckHttpOptions`

#### Returns

`void`

***

### onResponse?

> `optional` **onResponse?**: (`req`, `opts`) => `void`

Callback to handle a response

#### Parameters

##### req

`IncomingMessage`

##### opts

`CheckHttpOptions`

#### Returns

`void`

***

### requestOptions

> **requestOptions**: `RequestOptions`

Node HTTP request options.
Note: The `timeout` option is for connect time only.

***

### timeout

> **timeout**: `number`

Total request time timeout, in milliseconds. Covers connecting, waiting for
headers, running `checkOk`, and receiving the rest of the body. Defaults
to 60000; pass Infinity to disable.
