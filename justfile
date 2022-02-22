set positional-arguments
export PATH := ((justfile_directory() + "/node_modules/.bin:") + env_var("PATH"))
export JUSTDIR := justfile_directory()

default:
  just --list

build:
  tsc

cert:
  cd "$JUSTDIR/spec/fixtures/cert" && \
  CAROOT=. mkcert && \
  CAROOT=. mkcert localhost

cloc:
  cloc "$JUSTDIR/src"

coverage:
  c8 -n src just test

docs:
  cd "$JUSTDIR" && typedoc

test:
  ts-node spec/index.spec.ts
