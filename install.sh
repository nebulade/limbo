#!/bin/bash

set -eux

mkdir -p /opt/limbo/
cp -rf * /opt/limbo/

cd /opt/limbo/
npm ci

chown -R nebulon:nebulon /opt/limbo

cp limbo.service /etc/systemd/system
systemctl daemon-reload
systemctl enable limbo.service
systemctl restart limbo.service
