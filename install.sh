#!/bin/bash

set -eux

mkdir /opt/limbo/
cp -rf * /opt/limbo/

cd /opt/limbo/
npm ci

cp limbo.service /etc/systemd/system
systemctl daemon-reload
systemctl enable limbo.service
systemctl restart limbo.service
