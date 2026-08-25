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

Instantly destroy the request as soon as it connects?
This can save time when the response is large or takes time to send.

***

### baseUrl?

> `optional` **baseUrl?**: `URL`

The "base URL" to use when constructing the URL (2nd arg to new URL())

***

### checkOk

> **checkOk**: (`res`, `opts`) => `any`

Check whether a response is OK

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

Whether to put the response stream into "flowing mode" automatically. If
you set this to false, you may need to call res.resume() manually in the
request's response callback.

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

Total request time timeout, in milliseconds
