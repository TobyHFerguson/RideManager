# Setting Up Shared GAS Best Practices

This document explains how to set up symlinks to share `gas-best-practices.md` across multiple Google Apps Script projects.

## Overview

The `gas-best-practices.md` file contains universal GAS development guidelines that apply to **any GAS codebase**. To avoid duplication and ensure consistency, we use symlinks to share a single master copy across all GAS projects.

## Directory Structure

```
/Users/toby/Development/GAS/
├── _shared/
│   └── gas-best-practices.md            (~1,400 lines) - Master copy
│
├── RideManager/
│   └── .github/
│       ├── copilot-instructions.md      (~1,500 lines) - Project-specific
│       └── gas-best-practices.md        (Symlink → ../../_shared/gas-best-practices.md)
│
└── SCCCCMembershipManagement/
    └── .github/
        ├── copilot-instructions.md      (~1,000 lines?) - Project-specific
        └── gas-best-practices.md        (Symlink → ../../_shared/gas-best-practices.md)
```

## Setup Instructions

### Step 1: Create Shared Directory

```bash
mkdir -p /Users/toby/Development/GAS/_shared
```

### Step 2: Copy Master File to Shared Location

```bash
# From RideManager repository
cp /Users/toby/Development/GAS/RideManager/.github/gas-best-practices.md \
   /Users/toby/Development/GAS/_shared/gas-best-practices.md
```

### Step 3: Create Symlink in RideManager

```bash
cd /Users/toby/Development/GAS/RideManager/.github

# Remove the original file
rm gas-best-practices.md

# Create symlink to shared location
ln -s ../../_shared/gas-best-practices.md gas-best-practices.md
```

### Step 4: Verify Symlink Works

```bash
# Should show symlink arrow pointing to shared file
ls -la /Users/toby/Development/GAS/RideManager/.github/gas-best-practices.md

# Should display file content from shared location
cat /Users/toby/Development/GAS/RideManager/.github/gas-best-practices.md | head -20
```

### Step 5: Commit Symlink to Git

```bash
cd /Users/toby/Development/GAS/RideManager
git add .github/gas-best-practices.md
git commit -m "refactor: Replace gas-best-practices.md with symlink to shared master"
git push
```

### Step 6: Set Up Additional Projects (e.g., MembershipManagement)

```bash
cd /Users/toby/Development/GAS/SCCCCMembershipManagement/.github

# Create symlink
ln -s ../../_shared/gas-best-practices.md gas-best-practices.md

# Commit
cd /Users/toby/Development/GAS/SCCCCMembershipManagement
git add .github/gas-best-practices.md
git commit -m "feat: Add symlink to shared gas-best-practices.md"
git push
```

## Testing Symlink Compatibility

### Test 1: Verify GitHub Copilot Can Read Symlinks

1. Open your project in VS Code
2. Ask GitHub Copilot Chat: "What are the GAS API limitations?"
3. Verify the response references content from `gas-best-practices.md`

**Expected**: Copilot should read and reference the symlinked file content.

**If symlinks don't work**: GitHub Copilot may not follow symlinks in some environments. In this case, use the fallback sync script approach (see below).

### Test 2: Verify Git Tracks Symlinks Correctly

```bash
git ls-files -s .github/gas-best-practices.md
```

**Expected output**: Should show `120000` mode (symlink):
```
120000 <hash> 0	.github/gas-best-practices.md
```

## Fallback: Sync Script (If Symlinks Don't Work)

If GitHub Copilot or your environment doesn't support symlinks, use a sync script to keep files in sync:

### Create Sync Script

```bash
# Create scripts/sync-best-practices.sh
cat > scripts/sync-best-practices.sh << 'EOF'
#!/bin/bash
# Sync gas-best-practices.md from shared master to all projects

SHARED_FILE="/Users/toby/Development/GAS/_shared/gas-best-practices.md"
PROJECTS=(
    "/Users/toby/Development/GAS/RideManager/.github"
    "/Users/toby/Development/GAS/SCCCCMembershipManagement/.github"
)

for project_dir in "${PROJECTS[@]}"; do
    if [ -d "$project_dir" ]; then
        cp "$SHARED_FILE" "$project_dir/gas-best-practices.md"
        echo "✓ Synced to $project_dir"
    else
        echo "✗ Directory not found: $project_dir"
    fi
done

echo "Sync complete!"
EOF

chmod +x scripts/sync-best-practices.sh
```

### Usage

Run after editing the master file:
```bash
# Edit master file
vim /Users/toby/Development/GAS/_shared/gas-best-practices.md

# Sync to all projects
./scripts/sync-best-practices.sh

# Commit changes in each project
cd /Users/toby/Development/GAS/RideManager
git add .github/gas-best-practices.md
git commit -m "docs: Update gas-best-practices.md from shared master"
```

## Maintaining the Shared File

### Editing Best Practices

**Always edit the master file**:
```bash
# Open master file
vim /Users/toby/Development/GAS/_shared/gas-best-practices.md

# Changes automatically appear in all projects via symlink
# OR run sync script if using fallback approach
```

**Never edit project-specific copies** - they will be overwritten by sync script or are symlinks.

### Adding Universal Guidelines

When you discover a new universal GAS pattern:

1. Add it to `/Users/toby/Development/GAS/_shared/gas-best-practices.md`
2. Symlinks automatically reflect changes (or run sync script if using fallback)
3. Commit the change in the master repository (create a `_shared` git repo if needed)
4. Pull/sync in all project repositories

### Project-Specific Guidelines

Add to `copilot-instructions.md` in each project:
- Module inventories
- Domain-specific patterns
- Project-specific examples
- Migration guides specific to that project

## Benefits

✅ **Single Source of Truth**: All GAS best practices in one file  
✅ **Zero Duplication**: No copy-paste errors or inconsistencies  
✅ **Easy Updates**: Change once, applies everywhere  
✅ **Reduced Token Usage**: ~50% reduction in copilot-instructions.md size  
✅ **Better Organization**: Clear separation of universal vs project-specific

## Troubleshooting

### Symlink Shows as Regular File in Git

**Problem**: `git ls-files -s` shows `100644` instead of `120000`

**Solution**: 
```bash
# Remove file from git
git rm .github/gas-best-practices.md

# Re-create symlink
ln -s ../../_shared/gas-best-practices.md .github/gas-best-practices.md

# Add as symlink
git add .github/gas-best-practices.md

# Verify it's a symlink
git ls-files -s .github/gas-best-practices.md  # Should show 120000
```

### Copilot Can't Read Symlink

**Problem**: GitHub Copilot doesn't seem to access symlink content

**Solution**: Use the fallback sync script approach instead of symlinks

### Cross-Platform Issues (Windows)

**Problem**: Windows doesn't support symlinks well

**Solution**: Use the sync script approach on Windows, or enable Developer Mode to allow symlinks

## See Also

- [copilot-instructions.md](../copilot-instructions.md) - RideManager-specific guidelines
- [gas-best-practices.md](gas-best-practices.md) - Universal GAS patterns (master or symlink)
