#!/bin/bash
curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
java -jar bfg-1.14.0.jar --delete-folders "node_modules" --no-blob-protection
java -jar bfg-1.14.0.jar --delete-folders ".next" --no-blob-protection
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force
