[**rewait**](../README.md)

***

[rewait](../README.md) / CheckHttpResponseOptions

# Interface: CheckHttpResponseOptions

Declarative response checks for use as the `checkOk` option of `http()`.

A response is accepted when its status code matches `status` or falls
within `statusRange`. When neither is given, any 2xx or 3xx status is
accepted. Body checks are only applied once the status check passes, and
every body check given must pass.

## Properties

### bodyExact?

> `optional` **bodyExact?**: `string`

The body must equal this string exactly

***

### bodyRegex?

> `optional` **bodyRegex?**: `RegExp`

The body must match this regular expression

***

### bodySubstring?

> `optional` **bodySubstring?**: `string`

The body must contain this substring

***

### encoding?

> `optional` **encoding?**: `BufferEncoding`

Encoding used to decode the body. Defaults to utf8.

***

### status?

> `optional` **status?**: `number` \| `number`[]

Accept these exact status codes

***

### statusRange?

> `optional` **statusRange?**: \[`number`, `number`\]

Accept status codes in this inclusive [min, max] range
