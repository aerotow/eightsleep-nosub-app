#!/bin/bash
pnpm run db:generate
pnpm run db:migrate
pnpm run start
