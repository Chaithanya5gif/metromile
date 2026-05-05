#!/bin/bash

# Reset staging area
git reset

# Add only the files you want
git add backend/app/main.py
git add backend/app/database.py
git add backend/app/models/models.py
git add frontend/src/utils/offlineStorage.ts
git add FEATURES.md

# Commit with simple message
git commit -m "docs: add comprehensive documentation and offline storage utility"

# Push to remote
git push

echo "✅ Done! Changes committed and pushed."
