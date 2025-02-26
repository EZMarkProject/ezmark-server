#!/bin/bash

git pull
pnpm build
pm2 list | grep -q "ezmark-server" && pm2 restart ezmark-server || pm2 start ecosystem.config.js