#!/usr/bin

set -e

bun lint

bun run test

bun run build

