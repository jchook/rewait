[**rewait**](../README.md)

***

[rewait](../README.md) / checkSocketResponse

# Function: checkSocketResponse()

> **checkSocketResponse**(`opts?`): (`socket`) => `Promise`\<`void`\>

Build a `checkOk` function for `socket()` or `udp()` that optionally sends
a payload and then waits for a response matching the given body checks.

```ts
socket('tcp://localhost:6379', {
  checkOk: checkSocketResponse({ send: 'PING\r\n', bodyRegex: /^\+PONG/ }),
})
```

## Parameters

### opts?

[`CheckSocketResponseOptions`](../interfaces/CheckSocketResponseOptions.md) = `{}`

## Returns

(`socket`) => `Promise`\<`void`\>
