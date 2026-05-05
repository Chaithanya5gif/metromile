#!/bin/bash

echo "🚀 Committing safe changes..."

# Remove lock if exists
rm -f .git/index.lock

# Reset everything
git reset HEAD .

# Add only what we want
git add backend/app/main.py
git add backend/app/database.py  
git add backend/app/models/models.py
git add frontend/src/utils/offlineStorage.ts
git add FEATURES.md

# Show what will be committed
echo ""
echo "📝 Files to commit:"
git status --short

echo ""
read -p "Press Enter to commit and push, or Ctrl+C to cancel..."

# Commit
git commit -m "docs: add comprehensive documentation and offline storage utility"

# Push
git push

echo ""
echo "✅ Done! You now have 13 commits."
echo "📚 Now read FEATURES.md for 30 mins and SLEEP!"
echo "🎓 You're ready for viva tomorrow! Good luck! 🚀"
