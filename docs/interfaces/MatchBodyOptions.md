[**rewait**](../README.md)

***

[rewait](../README.md) / MatchBodyOptions

# Interface: MatchBodyOptions

Declarative checks against a decoded response body. Every check given must
pass.

## Extended by

- [`CheckHttpResponseOptions`](CheckHttpResponseOptions.md)
- [`CheckSocketResponseOptions`](CheckSocketResponseOptions.md)

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
