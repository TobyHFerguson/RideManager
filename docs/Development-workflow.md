# Git Branching Strategy and Workflow
## Overview
Solo developer workflow for Google Apps Script deployment with production safety through tags and pre-deployment validation.

## Branch Structure
````
master (production trunk)
  ↑
  ├─ feature/announcement-system
  ├─ feature/rwgps-members-sync
  └─ feature/trigger-cleanup
````
### Branches:

* `master` - Production trunk, deployed code only
* `feature/*` - Feature branches for parallel work


## Development Workflow
### Starting a New Feature

````
git checkout master
git pull
git checkout -b feature/my-feature-name
````
### Working on Feature

````
# Make changes
git add src/MyModule.js
git commit -m "Add feature implementation"

# Test in dev environment
npm run dev:push

# Continue iterating
````
Completing a Feature

````
# Ensure all validation passes
npm test && npm run typecheck && npm run validate-exports

# Merge to master
git checkout master
git merge --no-ff feature/my-feature-name

# Tag the release
git tag -a v2025.01.02 -m "Add my feature"
git push origin master v2025.01.02

# Deploy to production
npm run prod:push

# Clean up feature branch
git branch -d feature/my-feature-name
````
## Production Deployment Checklist

**MANDATORY before every production deployment:**

```bash
# 1. Check VS Code errors (CRITICAL)
# Open VS Code and check Problems panel (⇧⌘M)
# OR use Copilot Chat: @workspace /get_errors(['src/'])
# Must show ZERO errors

# 2. Run full validation suite
npm test && npm run typecheck && npm run validate-exports

# 3. Ensure clean git state
git status  # No uncommitted changes

# 4. Tag the release
git tag -a v2025.01.02 -m "$(git log -1 --pretty=%B)"

# 5. Push tag
git push origin master v2025.01.02

# 6. Deploy
npm run prod:push
```
### Tag Convention
**Date-based tags**: `vYYYY.MM.DD`
````
# Tag with current date
git tag -a v$(date +%Y.%m.%d) -m "Feature description"

# Tag with automatic commit message
git tag -a v$(date +%Y.%m.%d) -m "$(git log -1 --pretty=%B)"
````
#### Why date tags:

* ✅ Instant recognition of deployment timing
* ✅ Chronological sorting
* ✅ Simple rollback to specific date
* ✅ No version number debates
### Multiple Deployments Same Day

**Use sequential suffixes for multiple same-day releases**:

```bash
# Pattern: vYYYY.MM.DD-{a,b,c,...}
git tag -a v2025.01.02-a -m "First deployment - Fix email bug"
npm run prod:push
git push origin v2025.01.02-a

git tag -a v2025.01.02-b -m "Second deployment - Add cancellation"
npm run prod:push
git push origin v2025.01.02-b
```

**When to use**:
- ✅ Each micro-feature deployed independently
- ✅ Need rollback granularity between deployments
- ✅ Production testing between features

**When to batch**:
- ✅ Related fixes for same issue
- ✅ All tested together before production
- ✅ Logical unit of work
### Rollback Procedure (Tag-Based Production)

**Scenario**: Production deployment has a bug, need to rollback

```bash
# 1. List recent tags to find rollback target
git tag -l -n
# v2025.01.02  Add announcement cancellation (BUGGY - currently in prod)
# v2024.12.31  Initial announcement system (KNOWN GOOD)
# v2024.12.28  Fix trigger cleanup

# 2. Checkout the known good tag
git checkout v2024.12.31

# 3. Verify you're on the right commit
git log --oneline -5

# 4. Deploy the rollback to production
npm run prod:push
# This creates Version.js with the v2024.12.31 commit hash

# 5. Verify in spreadsheet
# Menu > "Ride Schedulers" > "Show Version"
# Should show the rollback commit hash

# 6. Tag the rollback deployment (for history)
git tag -a v2025.01.02-rollback -m "Rollback to v2024.12.31 due to [bug description]"
git push origin v2025.01.02-rollback

# 7. Return to master (master stays ahead - that's OK!)
git checkout master
# Master still has the buggy code - fix it before next deployment
```

**Key benefits of this approach**:
1. ✅ **Tags define production** - `v2024.12.31` is now in production
2. ✅ **Master can be ahead** - Master still has v2025.01.02 code (buggy)
3. ✅ **Version.js shows truth** - Spreadsheet menu shows rollback commit hash
4. ✅ **Rollback tag provides history** - `v2025.01.02-rollback` documents the event
5. ✅ **Simple recovery** - Fix bug in master, tag v2025.01.03, deploy

**What about the buggy code in master?**

Option 1: Leave it, fix forward
```bash
# Master has buggy v2025.01.02 code
git checkout master

# Fix the bug
git add src/BuggyModule.js
git commit -m "Fix bug from v2025.01.02"

# Deploy fixed version
git tag -a v2025.01.03 -m "Fix bug from v2025.01.02"
npm run prod:push
git push origin master v2025.01.03
```

Option 2: Reset master if you want clean history (optional)
```bash
# Only if you want master to match production exactly
git checkout master
git reset --hard v2024.12.31
git push origin master --force

# Then re-apply your changes (without the bug)
# ... make changes ...
git commit -m "Add feature (bug fixed)"
git tag -a v2025.01.03 -m "Add feature (corrected)"
npm run prod:push
```

**Why this workflow is better**:
- Production state is **explicit** (defined by tags)
- Master branch position is **flexible** (can be ahead or behind)
- Version.js provides **runtime verification** (shows what's actually deployed)
- Rollback tags provide **audit trail** (why and when you rolled back)
### Parallel Feature Development
````
# Working on feature A
git checkout -b feature/announcement-cancellation
# ... work and commits ...
npm run dev:push  # Test in dev

# Switch to feature B (feature A incomplete)
git checkout master
git checkout -b feature/rwgps-members-sync
# ... work and commits ...
npm run dev:push  # Test in dev

# Complete feature B first
git checkout master
git merge --no-ff feature/rwgps-members-sync
git tag -a v2025.01.02 -m "Add RWGPS members sync"
npm run prod:push

# Return to feature A
git checkout feature/announcement-cancellation
# ... continue work ...
````
### Tag History and Documentation
````
# View all tags with messages
git tag -l -n

# View tags in chronological order
git log --tags --oneline --decorate

# Search tags by content
git tag -l -n | grep "announcement"

# Show what's in a specific tag
git show v2025.01.02
````
### Emergency Hotfix Workflow

````
# 1. Create hotfix branch from current master
git checkout master
git checkout -b hotfix/critical-bug

# 2. Fix the bug
git add src/BuggyModule.js
git commit -m "Fix critical production bug"

# 3. Validate
npm test && npm run typecheck

# 4. Merge and deploy immediately
git checkout master
git merge --no-ff hotfix/critical-bug
git tag -a v2025.01.02-hotfix -m "Critical bug fix"
git push origin master v2025.01.02-hotfix
npm run prod:push

# 5. Clean up
git branch -d hotfix/critical-bug
````
## Best Practices

1. ✅ **Always work in feature branches** - Keep master clean
2. ✅ **Tag before every production deployment** - Tags define production state
3. ✅ **Master can be ahead of production** - That's OK, tags define what's deployed
4. ✅ **Use `--no-ff` merges** - Preserves feature branch history
5. ✅ **Run full validation before merge** - Catch errors early
6. ✅ **Keep feature branches short-lived** - Days, not weeks
7. ✅ **Delete merged feature branches** - Reduces clutter
8. ✅ **Use descriptive commit messages** - Captured in tags
9. ✅ **Check Version.js in spreadsheet** - Confirms what's actually deployed
## Anti-Patterns to Avoid
* ❌ Committing directly to master (use feature branches)
* ❌ Deploying without tagging (can't rollback)
* ❌ Skipping validation before merge (breaks production)
* ❌ Force-pushing without coordination (solo dev = acceptable)
* ❌ Keeping stale feature branches (merge or delete)