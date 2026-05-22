#!/bin/sh
./pocketbase superuser upsert little@local.com littlestein
exec ./pocketbase serve --http=0.0.0.0:8090
