#!/bin/bash
pnpm run db:generate

# Crash if the migrations fail
set -e
pnpm run db:migrate
pnpm run start
