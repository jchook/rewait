# Default to node_modules/.bin when executing binaries
export PATH := ((justfile_directory() + "/node_modules/.bin:") + env_var("PATH"))

# Where to store mkcert output
export CAROOT := (justfile_directory() + "/spec/fixtures/cert")

default:
  just --list

build:
  just build-js
  just build-docs

build-js:
  tsc

build-docs:
  typedoc

cert:
  mkcert
  cd $CAROOT && mkcert localhost

cloc:
  cloc src

coverage:
  c8 -n src just test

test:
  ts-node spec/index.spec.ts

