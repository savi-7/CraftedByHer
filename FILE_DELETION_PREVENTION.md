# File Deletion Prevention Guide

## Why Files Are Getting Deleted

Files may be getting deleted due to several reasons:

### 1. **Git Operations**
- **Git Reset/Revert**: If you're running `git reset` or `git revert`, it can restore files to a previous state
- **Git Checkout**: Switching branches can overwrite files
- **Solution**: Check your git history: `git log --oneline` and `git status`

### 2. **IDE/Editor Auto-Cleanup**
- Some IDEs have auto-cleanup features that remove "unused" files
- **Solution**: Check your IDE settings for file cleanup/optimization features

### 3. **File Watchers**
- Hot reload systems might delete files if they detect errors
- **Solution**: Check your dev server logs for errors

### 4. **Cursor/VS Code Extensions**
- Some extensions might clean up files
- **Solution**: Disable suspicious extensions temporarily

### 5. **Manual Deletion**
- Files might be accidentally deleted
- **Solution**: Use version control (Git) to track changes

## Prevention Steps

### ✅ **1. Use Git Properly**
```bash
# Always commit your changes
git add .
git commit -m "Restored Health Assistant and Order Planner modules"

# Create a backup branch
git checkout -b backup-before-changes
git checkout main
```

### ✅ **2. Add Files to Git**
```bash
# Make sure files are tracked
git add client/src/components/HealthAssistant.jsx
git add client/src/pages/HealthAssistantPage.jsx
git add client/src/pages/OrderPlanner.jsx
git add server/routes/health.js

# Commit them
git commit -m "Add Health Assistant and Order Planner modules"
```

### ✅ **3. Check .gitignore**
Make sure these files are NOT in `.gitignore`:
- `client/src/components/HealthAssistant.jsx`
- `client/src/pages/HealthAssistantPage.jsx`
- `client/src/pages/OrderPlanner.jsx`
- `server/routes/health.js`

### ✅ **4. Monitor File Changes**
```bash
# Watch for file deletions
git status
git diff
```

### ✅ **5. Use File Locks (if on shared system)**
If multiple people are working on the project, coordinate file access.

## Current Restored Files

### Frontend:
- ✅ `client/src/components/HealthAssistant.jsx`
- ✅ `client/src/pages/HealthAssistantPage.jsx`
- ✅ `client/src/pages/OrderPlanner.jsx`

### Backend:
- ✅ `server/routes/health.js` (NEW - created now)

### Routes Added:
- ✅ `/health-assistant` route in `App.jsx`
- ✅ `/order-planner` route in `App.jsx`
- ✅ `/api/health/predict` route in `server/index.js`

## Verification

Run these commands to verify files exist:

```bash
# Check frontend files
ls client/src/components/HealthAssistant.jsx
ls client/src/pages/HealthAssistantPage.jsx
ls client/src/pages/OrderPlanner.jsx

# Check backend files
ls server/routes/health.js

# Check if routes are registered
grep -r "HealthAssistant" client/src/App.jsx
grep -r "OrderPlanner" client/src/App.jsx
grep -r "/api/health" server/index.js
```

## If Files Get Deleted Again

1. **Check Git History**: `git log --all --full-history -- "**/HealthAssistant.jsx"`
2. **Restore from Git**: `git checkout HEAD -- client/src/components/HealthAssistant.jsx`
3. **Check IDE Settings**: Look for auto-cleanup or optimization features
4. **Check File Permissions**: Ensure files aren't read-only
5. **Contact Support**: If issue persists, it might be a system-level problem

## Quick Restore Script

If files get deleted, you can quickly restore them by running:

```bash
# Restore from Git (if committed)
git checkout HEAD -- client/src/components/HealthAssistant.jsx
git checkout HEAD -- client/src/pages/HealthAssistantPage.jsx
git checkout HEAD -- client/src/pages/OrderPlanner.jsx
git checkout HEAD -- server/routes/health.js

# Or restore from this commit
git checkout <commit-hash> -- client/src/components/HealthAssistant.jsx
```


