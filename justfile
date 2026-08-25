# Default to node_modules/.bin when executing binaries
export PATH := ((justfile_directory() + "/node_modules/.bin:") + env_var("PATH"))

# Where to store mkcert output
export CAROOT := (justfile_directory() + "/spec/fixtures/cert")

# List all of the available commands
list:
  just --list

# Build the project
build:
  just build-js
  just build-docs

# Compile TypeScript to JavaScript
build-js:
  tsc
  node scripts/cjs-interop.js

# Compile the documentation
build-docs:
  typedoc

# Generate a new HTTPS certificate (for testing purposes)
cert:
  mkcert
  cd $CAROOT && mkcert localhost

# Count the lines of code in the project
cloc:
  cloc src

# Format the code
format:
  biome format --write .

# Lint the code
lint:
  biome check .

# Generate a test coverage report (needs a node runner for V8 coverage)
coverage:
  c8 --100 -n src tsx spec/index.spec.ts

# Run the tests
test:
  bun spec/index.spec.ts | faucet

