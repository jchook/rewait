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
  typedoc \
    --allReflectionsHaveOwnDocument \
    --disableSources \
    --excludePrivate \
    --excludeProtected \
    --gitRevision main \
    --readme none \
    --plugin typedoc-plugin-markdown \
    --out docs \
    --excludeExternals \
    --tsconfig ./tsconfig.json \
    --hideGenerator \
    --hideBreadcrumbs \
    src/index.ts

test:
  ts-node spec/index.spec.ts
