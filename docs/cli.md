rewait CLI
==========

Install with `npm i -g rewait`, or run it with `npx rewait`. This page is the
output of `rewait --help`.

```
rewait waits for external resources to become available.

Usage: rewait [options] <check> [check options] [<check> [check options]...]

Each check is a URL. The scheme selects the kind of check:

  http://host[:port]/path    HTTP request succeeds (2xx or 3xx by default)
  https://host[:port]/path   The same, over TLS
  tcp://host:port            TCP connection is accepted
  unix:///path/to.sock       Unix domain socket connection is accepted
  udp://host:port            UDP socket connects. Connecting never fails, so
                             use --send and a --body option to verify a reply
  file:///path or /path      File exists

Options after a check apply to that check only. Global options may appear
anywhere. Checks run in parallel, and rewait exits successfully once every
check has passed, or with an error once the timeout elapses.

Durations accept the suffixes ms, s, m and h (500ms, 5s, 2m). A bare number is
milliseconds. Data values starting with @ are read from the named file.

Options:
  -t, --timeout <duration>          Give up after this long. 0 waits forever.
                                    Default: 60s
  -i, --interval <duration>         Minimum time between attempts of a check. 0
                                    retries as soon as it fails. Default: 250ms
      --once                        Try each check once and exit, without
                                    retrying. Useful for Docker HEALTHCHECK,
                                    which does its own retrying
      --sequential                  Run checks one after another instead of in
                                    parallel
  -v, --verbose                     Report the outcome of every attempt on
                                    stderr
  -q, --quiet                       Print nothing, even on failure
  -h, --help                        Show this help and exit
  -V, --version                     Print the version and exit

HTTP options:
  -X, --request <method>            Request method. Default: GET, or POST when
                                    --data is given
  -H, --header <header>             Add a request header, e.g. "Authorization:
                                    Bearer x". May be repeated
  -d, --data <data>                 Request body. @file reads the body from a
                                    file
  -u, --user <user:password>        Basic auth credentials
  -k, --insecure                    Skip TLS certificate verification
      --cacert <file>               PEM file of CA certificates to trust
      --connect-timeout <duration>  Fail an attempt if the connection is not
                                    established in time. 0 disables
      --max-time <duration>         Fail an attempt if the whole response is not
                                    received in time. 0 disables. Default: 60s
      --bail                        Close the connection as soon as the response
                                    is checked, without reading the rest of the
                                    body
      --status <codes>              Accept only these status codes, comma
                                    separated, e.g. 200,204. Default: any 2xx or
                                    3xx
      --status-range <min-max>      Accept status codes in this inclusive range,
                                    e.g. 200-299. Combines with --status

TCP, Unix socket and UDP options:
      --send <data>                 Data to send once connected. @file reads it
                                    from a file. Use $'...' shell quoting for
                                    control characters, e.g. $'PING\r\n'
      --response-timeout <duration> Fail an attempt if no matching response
                                    arrives in time. 0 waits until the socket
                                    closes. Default: 5s

Response body options (HTTP, TCP, Unix socket and UDP):
      --body-substring <text>       The response body must contain this text
      --body-regex <pattern>        The response body must match this regular
                                    expression. Write /pattern/flags to pass
                                    flags
      --body-exact <text>           The response body must equal this text
                                    exactly
      --encoding <name>             Encoding used to decode the body, and to
                                    encode --send. Default: utf8

File options:
      --min-size <bytes>            The file must be at least this many bytes

Examples:
  # Wait for a database and a web service before starting
  rewait -t 90s tcp://db:5432 http://api:8080/healthz && exec node server.js

  # POST with a bearer token and check the reply
  rewait https://api.example.com/ping -X POST \
    -H "Authorization: Bearer $TOKEN" -d '{"probe":true}' \
    --status 200 --body-substring '"ok":true'

  # Send a datagram and wait for a matching reply
  rewait udp://statsd:8125 --send 'health' --body-regex '^ok'

  # Docker HEALTHCHECK: try once, Docker handles retries
  HEALTHCHECK CMD rewait --once --max-time 2s http://localhost:8080/healthz

Exit codes:
  0  every check passed
  1  the timeout elapsed, or a check failed with --once
  2  usage error
```
