[**rewait**](../README.md)

***

[rewait](../README.md) / CheckSocketResponseOptions

# Interface: CheckSocketResponseOptions

Declarative checks for use as the `checkOk` option of `socket()` and
`udp()`.

`send` is written to the socket first, if given. When any body check is
given, incoming data is accumulated until every check passes, at which
point the check succeeds. If the socket closes or `timeout` elapses before
that, the check fails.

## Extends

- [`MatchBodyOptions`](MatchBodyOptions.md)

## Properties

### bodyExact?

> `optional` **bodyExact?**: `string`

The body must equal this string exactly

#### Inherited from

[`MatchBodyOptions`](MatchBodyOptions.md).[`bodyExact`](MatchBodyOptions.md#bodyexact)

***

### bodyRegex?

> `optional` **bodyRegex?**: `RegExp`

The body must match this regular expression

#### Inherited from

[`MatchBodyOptions`](MatchBodyOptions.md).[`bodyRegex`](MatchBodyOptions.md#bodyregex)

***

### bodySubstring?

> `optional` **bodySubstring?**: `string`

The body must contain this substring

#### Inherited from

[`MatchBodyOptions`](MatchBodyOptions.md).[`bodySubstring`](MatchBodyOptions.md#bodysubstring)

***

### encoding?

> `optional` **encoding?**: `BufferEncoding`

Encoding used to decode the body. Defaults to utf8.

#### Inherited from

[`MatchBodyOptions`](MatchBodyOptions.md).[`encoding`](MatchBodyOptions.md#encoding)

***

### send?

> `optional` **send?**: `string` \| `Buffer`\<`ArrayBufferLike`\>

Data to send once connected. Strings are encoded using `encoding`.

***

### timeout?

> `optional` **timeout?**: `number`

How long to wait for a matching response, in milliseconds.
Defaults to 5000.
