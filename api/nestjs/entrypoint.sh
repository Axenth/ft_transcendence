#!/bin/bash

cd /home/node/app && echo "DATABASE_URL=\"$DATABASE_URL\"" > .env && npx prisma generate && npx prisma migrate deploy
sleep 5
npm run build

exec "$@"