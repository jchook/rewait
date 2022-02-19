export PATH := ((justfile_directory() + "/node_modules/.bin:") + env_var("PATH"))

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
  ts-node src/index.spec.ts | faucet
