# Issue Template for SCCCCMembershipManagement

## Title
Add shared gas-best-practices.md to MembershipManagement project

## Description

This issue tracks the setup of universal GAS best practices in the SCCCCMembershipManagement repository, using the same shared file structure established in RideManager.

**Parent Issue**: TobyHFerguson/RideManager#206

## Background

The RideManager project has successfully extracted universal Google Apps Script (GAS) development guidelines into a reusable `gas-best-practices.md` file. This file contains patterns that apply to **any GAS codebase**:

- Pre-Coding Checklist (TDD workflow)
- Search Before Implementing
- Type Safety (zero tolerance for `any`/`Object`)
- GAS API Limitations
- Architecture Patterns (Core/Adapter separation)
- Testing Strategy
- TypeScript Type Coverage
- Common GAS + clasp Pain Points
- Code Modification Workflow

## Tasks

### 1. Set Up Symlink to Shared File

**Prerequisites**: The shared directory structure must exist:
```bash
/Users/toby/Development/GAS/_shared/gas-best-practices.md
```

**Steps**:
```bash
cd /Users/toby/Development/GAS/SCCCCMembershipManagement/.github

# Create symlink to shared master copy
ln -s ../../_shared/gas-best-practices.md gas-best-practices.md

# Verify symlink works
ls -la gas-best-practices.md
cat gas-best-practices.md | head -20

# Commit symlink
cd /Users/toby/Development/GAS/SCCCCMembershipManagement
git add .github/gas-best-practices.md
git commit -m "feat: Add symlink to shared gas-best-practices.md"
git push
```

### 2. Update copilot-instructions.md (if exists)

If the MembershipManagement project has a `.github/copilot-instructions.md` file, update it to reference the shared file:

```markdown
# MembershipManagement Copilot Instructions

> **Universal GAS Patterns**: For Google Apps Script development best practices (type safety, testing, 
> TDD workflow, architecture patterns, GAS API limitations), see [gas-best-practices.md](gas-best-practices.md).
> This file contains **MembershipManagement-specific** guidelines only.

---

## Quick Reference to Universal Patterns

Before writing ANY code, review these universal guidelines in [gas-best-practices.md](gas-best-practices.md):

- **Pre-Coding Checklist (TDD Workflow)**: Write tests FIRST, achieve 100% coverage
- **Search Before Implementing**: Always search for existing code before writing new functionality
- **Type Safety**: Zero tolerance for `{any}` and `{Object}` types
- **GAS API Limitations**: URLSearchParams, fetch(), setTimeout not available
- **Architecture**: Core/Adapter separation, 100% test coverage required
- **Code Modification Workflow**: Update tests, types, docs with every change

---

## MembershipManagement-Specific Guidelines

[Add project-specific content here]
```

### 3. Create copilot-instructions.md (if doesn't exist)

If the project doesn't have Copilot instructions yet, create `.github/copilot-instructions.md` with the template above and add MembershipManagement-specific guidelines:

- Module inventory (list of core modules and adapters)
- Domain-specific patterns (membership management specifics)
- Integration points (Spreadsheet structure, external APIs)
- Migration guides (if applicable)

### 4. Test Symlink

Verify GitHub Copilot can read the symlinked file:

1. Open MembershipManagement project in VS Code
2. Ask Copilot Chat: "What are the GAS API limitations?"
3. Verify response references content from gas-best-practices.md

**If symlinks don't work**: Follow the fallback sync script approach documented in [RideManager SYMLINK_SETUP.md](https://github.com/TobyHFerguson/RideManager/blob/main/.github/SYMLINK_SETUP.md)

### 5. Update Project Documentation

Update README.md or other documentation to reference the shared best practices:

```markdown
## Development Guidelines

This project follows universal Google Apps Script best practices. See [.github/gas-best-practices.md](.github/gas-best-practices.md) for:
- Type safety patterns
- Testing requirements (100% coverage on Core modules)
- Architecture patterns (Core/Adapter separation)
- GAS API limitations and alternatives
```

## Acceptance Criteria

- [ ] Symlink created: `.github/gas-best-practices.md → ../../_shared/gas-best-practices.md`
- [ ] Symlink verified to work (can read file content)
- [ ] Git recognizes symlink correctly (`git ls-files -s` shows `120000` mode)
- [ ] Copilot instructions updated (if file exists) or created (if doesn't exist)
- [ ] Copilot tested and can access symlinked content
- [ ] Documentation updated to reference shared best practices
- [ ] Changes committed and pushed

## Resources

- **Parent Issue**: [TobyHFerguson/RideManager#206](https://github.com/TobyHFerguson/RideManager/issues/206)
- **Setup Guide**: [RideManager SYMLINK_SETUP.md](https://github.com/TobyHFerguson/RideManager/blob/main/.github/SYMLINK_SETUP.md)
- **Shared Master File**: `/Users/toby/Development/GAS/_shared/gas-best-practices.md`
- **Example Implementation**: [RideManager .github/ directory](https://github.com/TobyHFerguson/RideManager/tree/main/.github)

## Notes

- The shared `gas-best-practices.md` file is ~1,400 lines and contains patterns applicable to ANY GAS project
- Using symlinks ensures a single source of truth - updates to the master file automatically apply to all projects
- If symlinks cause issues, use the fallback sync script approach documented in the setup guide
- Keep MembershipManagement-specific patterns in `copilot-instructions.md`, not in the shared file

## Timeline

Estimated effort: 30-60 minutes
- Symlink setup: 5 minutes
- Copilot instructions update: 15-30 minutes
- Testing and verification: 10-15 minutes
- Documentation update: 10 minutes

## Success Metrics

- Token usage reduction: Similar to RideManager (~50% reduction in context window usage)
- Reusability: Universal patterns shared across multiple projects
- Maintainability: Single file to update for GAS best practices across all projects
