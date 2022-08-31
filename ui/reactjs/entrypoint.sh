#!/bin/bash

cd /home/node/app && echo "REACT_APP_API_URL=\"$REACT_APP_API_URL\"" > .env && echo "REACT_APP_FRONTEND_URL=\"$REACT_APP_FRONTEND_URL\"" >> .env && echo "REACT_APP_CALLBACK_URL=\"$REACT_APP_CALLBACK_URL\"" >> .env
npm run build

exec "$@"