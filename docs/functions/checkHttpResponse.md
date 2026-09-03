[**rewait**](../README.md)

***

[rewait](../README.md) / checkHttpResponse

# Function: checkHttpResponse()

> **checkHttpResponse**(`opts?`): (`res`) => `Promise`\<`void`\>

Build a `checkOk` function for `http()` that verifies the response status
code and, optionally, the response body.

```ts
http('http://localhost:8080/healthz', {
  checkOk: checkHttpResponse({ status: 200, bodySubstring: 'OK' }),
})
```

## Parameters

### opts?

[`CheckHttpResponseOptions`](../interfaces/CheckHttpResponseOptions.md) = `{}`

## Returns

(`res`) => `Promise`\<`void`\>
