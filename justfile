set positional-arguments
export PATH := ((justfile_directory() + "/node_modules/.bin:") + env_var("PATH"))
export JUSTDIR := justfile_directory()

default:
  just --list

cert:
  cd "$JUSTDIR/spec/fixtures/cert" && \
  CAROOT=. mkcert && \
  CAROOT=. mkcert localhost

coverage:
  c8 -n src just test

docs:
  cd "$JUSTDIR" && typedoc

test:
  ts-node spec/index.spec.ts
