# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## Version Numbering Convention

This project uses **Calendar Versioning**: `YYYY.mm.dd[-suffix]`
- Date-based: `2026.01.03` (January 3, 2026)
- Multiple releases same day: `2026.01.03-a`, `2026.01.03-b`, etc.

## [Unreleased]

### RWGPSLib Internalization (Issues #165, #175)
- **NEW**: Internal RWGPS implementation as alternative to external RWGPSLib
- Created `RWGPSCore.js` with pure JavaScript business logic (100% test coverage: 50 tests)
- Created `RWGPSAdapter.js` as thin GAS wrapper for UrlFetchApp calls
- Implements Core/Adapter pattern for maintainability and testability
- **Drop-in replacement**: Same interface as external RWGPSLib, zero code changes required
- **Opt-in migration**: Set `RWGPSLIB_VERSION='internal'` to use new implementation
- **Backward compatible**: External RWGPSLib continues to work by default
- Features: Web session auth, organizer lookup, event/route operations, batch delete
- Documentation: See `docs/RWGPSLIB_MIGRATION.md` for migration guide

### Type Safety Improvements
- **CRITICAL FIX**: Replaced all unjustified `Record<string, any>` types with proper typedefs
- Created `ValidationOptions` typedefs with specific property types for ValidationCore
- Created `RowCoreParams` typedef with all 18 constructor properties properly typed
- Fixed RideManagerCore to use specific inline types for rowData and globals parameters
- **Impact**: Compile-time errors now catch property typos (e.g., `options.grouNames`) and wrong function signatures
- Remaining `Record<string, any>` uses are justified (true dictionaries with dynamic keys)

### Documentation
- Updated copilot-instructions.md with comprehensive Record<string, any> decision flowchart
- Added explicit "STOP checkpoint" before using Record<string, any>
- Documented when to use typedefs vs inline types vs Record<string, any>
- Added real examples of justified vs unjustified Record usage

### Validation
- ✅ Zero VS Code errors (get_errors)
- ✅ Zero TypeScript errors (npm run typecheck)
- ✅ All 366 tests passing
- ✅ All 25 modules validated (npm run validate-exports)

## [2026.01.03] - Sprint 1: Documentation & Type Safety

### Type Safety Improvements (Issue #188)
- Eliminated all `@param {Object}` types - replaced with specific shapes or `Record<string, any>` with documentation
- Eliminated all `@returns {Object}` types - replaced with specific return type shapes
- Audited all `: any` types in `.d.ts` files - remaining uses justified
- Achieved zero type errors across entire codebase
- Improved compile-time error detection and IntelliSense

### Documentation
- Created comprehensive CHANGELOG.md with full version history
- Updated Architecture-Refactoring-Plan.md with Phase 1, 2, 2.5 completion status
- Documented JSDoc limitations with inline object types

### Validation
- ✅ Zero VS Code errors (get_errors)
- ✅ Zero TypeScript errors (npm run typecheck)
- ✅ All 366 tests passing
- ✅ All 25 modules validated (npm run validate-exports)

## [2026.01.02] - Phase 2.5: Modernize ProcessingManager & UserLogger

**Goal**: Simplify UserLogger and remove ProcessingManager dead code.

#### Added
- `UserLoggerCore.js` - Pure JavaScript formatting logic with 100% test coverage
- `UserLoggerCore.test.js` - Comprehensive tests for log formatting
- `UserLoggerCore.d.ts` - Type definitions

#### Changed
- **UserLogger.js** - Refactored to use UserLoggerCore, simplified to Sheet-only logging
- **UserLogger.d.ts** - Updated type definitions for new interface

#### Removed
- **ProcessingManager.js** - Dead code (last used July 2019, replaced by TriggerManager)
- **ProcessingManager.d.ts** - Type definitions
- Drive file logging support from UserLogger (Sheet is single source of truth)
- DTRT (Drive Ride Tracker) references throughout codebase

#### Test Coverage
- UserLoggerCore: 100% coverage (all statements, branches, functions, lines)
- Total: 366 passing tests across 13 test suites

#### Validation
- ✅ Zero type errors (`npm run typecheck`)
- ✅ All exports validated (`npm run validate-exports`)
- ✅ All tests passing (366 tests)
- ✅ Deployed to production without issues

**Impact**: Simplified logging architecture, removed 500+ lines of dead code, improved maintainability.

## [2026.01.02-a] - Phase 2: UI & Validation Layer Refactoring

**BREAKING CHANGE**: Removed Commands.js, UIManager.js, and rowCheck.js (965 lines deleted).

**Goal**: Replace complex Commands/UIManager/rowCheck indirection with clean ValidationCore + UIHelper + RideCoordinator pattern.

#### Added
- **ValidationCore.js** - Pure JavaScript validation logic (95% test coverage)
  - `validateForScheduling()` - Validate rides before scheduling
  - `validateForCancellation()` - Validate rides before cancellation
  - `validateForUpdate()` - Validate rides before updates
  - `validateForRidersOnly()` - Validate riders-only mode
  - `convertDate()` - Date conversion utility
  - All validation rules extracted from rowCheck.js

- **ValidationCore.test.js** - Comprehensive tests (366 tests total)
  - Date conversion edge cases
  - Missing field detection
  - Past due ride detection
  - Cancelled ride detection
  - Duplicate ride detection
  - Bad route detection
  - Inappropriate group detection
  - Ride leader and route validation

- **UIHelper.js** - Simple GAS dialog utilities
  - `confirmOperation()` - Generic confirmation with validation display
  - `buildValidationMessage()` - Format errors/warnings for user
  - `showSuccess()` / `showError()` - Standard result dialogs
  - `promptForCancellationReason()` - Cancellation reason input

- **RideCoordinator.js** - Orchestration layer implementing validate → confirm → execute pattern
  - `scheduleRides()` - Schedule selected rides with validation
  - `cancelRides()` - Cancel rides with reason prompt
  - `updateRides()` - Update existing rides
  - `unscheduleRides()` - Remove rides from calendar
  - `syncAnnouncementQueue()` - Sync announcement queue
  - All operations follow consistent pattern: validate → confirm → execute

- Type definitions for all new modules:
  - `ValidationCore.d.ts`
  - `UIHelper.d.ts`
  - `RideCoordinator.d.ts`

#### Changed
- **MenuFunctions.js** - Updated to call RideCoordinator directly (was calling Commands.js)
  - `onOpen()` - Menu creation unchanged
  - All menu handlers now use RideCoordinator methods
  - Simplified logic: no more Command object abstraction

- **Exports.js** - Removed exports for deleted modules
  - Removed `Commands`, `UIManager`, `rowCheck` getters

#### Removed
- **Commands.js** (91 lines) - Abstraction layer no longer needed
  - Frozen command objects replaced by direct RideCoordinator calls
- **UIManager.js** (282 lines) - Over-engineered validation/confirmation layer
  - Replaced by ValidationCore + UIHelper combination
- **rowCheck.js** (240 lines) - Validation functions scattered across file
  - All rules moved to ValidationCore with proper organization
- **Type definitions**:
  - `Commands.d.ts` (118 lines)
  - `UIManager.d.ts` (34 lines)
  - `rowCheck.d.ts` (172 lines)

#### Architecture Improvements
- ✅ **100% testable validation**: All validation logic in pure JavaScript
- ✅ **Consistent pattern**: All operations use validate → confirm → execute
- ✅ **Reduced complexity**: 965 lines removed, cleaner call chain
- ✅ **Better separation**: Validation (Core) vs UI (Helper) vs Orchestration (Coordinator)
- ✅ **Improved maintainability**: Validation rules organized in single module
- ✅ **Enhanced type safety**: Comprehensive .d.ts files for all modules

#### Test Coverage
- ValidationCore: 95.13% statements, 91.12% branches, 100% functions
- Total: 366 passing tests across 13 test suites
- All new business logic has test coverage

#### Validation
- ✅ Zero type errors (`npm run typecheck`)
- ✅ All exports validated (`npm run validate-exports`)
- ✅ All tests passing (366 tests)
- ✅ Deployed to production without issues

**Migration**: No manual migration required. MenuFunctions automatically uses new RideCoordinator pattern.

## [1.2.0] - 2026-01-01

### 2026.01.01-b] -# Added
- **RideManagerCore.js** - Pure JavaScript business logic with 100% test coverage
  - `extractEventID()` - Extract event ID from RWGPS URL
  - `prepareRouteImport()` - Prepare route import configuration
  - `prepareCalendarEvent()` - Calculate calendar event details
  - `extractLatLong()` - Extract lat/long from route object
  - All business logic extracted from RideManager.js

- **RideManagerCore.test.js** - Comprehensive tests (32 tests)
  - Event ID extraction from various URL formats
  - Route import configuration with expiry calculation
  - Calendar event preparation
  - Edge cases and error conditions

- **RideManagerCore.d.ts** - Type definitions for all Core methods

#### Changed
- **RideManager.js** - Refactored to use RideManagerCore for business logic
  - Thin adapter layer calling GAS APIs only
  - All calculations moved to Core module
  - Better separation of concerns

- **RideManager.d.ts** - Updated type definitions

#### Test Coverage
- RideManagerCore: 100% coverage (all statements, branches, functions, lines)
- 32 new tests added

#### Validation
- ✅ Zero type errors (`npm run typecheck`)
- ✅ All exports validated (`npm run validate-exports`)
- ✅ All tests passing

**Impact**: All RideManager business logic now testable in Jest without GAS dependencies.

## [1.1.0] - 2025-12-30

### 2026.01.01-a] -# Added
- **RowCore.js** - Pure domain model with 100% test coverage
  - Clean camelCase property names (no spreadsheet dependencies)
  - Dirty field tracking for cell-level writes
  - Pure validation methods: `isScheduled()`, `isPastDue()`, etc.
  - Domain-focused behavior separate from persistence

- **RowCore.test.js** - Comprehensive tests (80+ tests)
  - Domain property access
  - Dirty field tracking
  - Validation methods
  - Edge cases and null handling

- **RowCore.d.ts** - Type definitions for domain model

#### Changed
- **ScheduleAdapter.js** - Enhanced to use RowCore
  - Anti-corruption layer: maps spreadsheet columns ↔ domain properties
  - Column mapping built from `getGlobals()` configuration
  - Returns RowCore instances directly (no Row class wrapper)
  - Cell-level write pattern preserved
  - Formula preservation unchanged

- **ScheduleAdapter.d.ts** - Updated type definitions

#### Removed
- **Row.js** - No longer needed (RowCore + ScheduleAdapter handle all functionality)

#### Architecture Principles Established
- ✅ **Domain independence**: RowCore knows nothing about spreadsheet structure
- ✅ **Anti-corruption layer**: ScheduleAdapter mediates between persistence and domain
- ✅ **Hexagonal architecture**: Domain models don't depend on persistence layer
- ✅ **100% testable**: All domain logic tested in pure JavaScript

#### Test Coverage
- RowCore: 100% coverage (all statements, branches, functions, lines)
- 80+ new tests added

#### Validation
- ✅ Zero type errors (`npm run typecheck`)
- ✅ All exports validated (`npm run validate-exports`)
- ✅ All tests passing
- ✅ Zero regression in production behavior

**Impact**: Domain model completely independent of Google Sheets, fully testable.

## [1.0.0] - 2025-12-15

### 2025.12.15] -aseline**: Functional RideWithGPS ride scheduling system with Google Calendar integration.

#### Core Features
- Ride scheduling and cancellation
- Route management with RWGPS integration
- Calendar event synchronization
- Announcement system with queue management
- Trigger-based automation (daily checks, scheduled announcements)
- User activity logging
- Multi-group support with route validation

#### Architecture
- Mixed GAS and pure JavaScript modules
- Some modules following Core/Adapter pattern:
  - AnnouncementCore + AnnouncementManager ✅
  - TriggerManagerCore + TriggerManager ✅
  - RWGPSMembersCore + RWGPSMembersAdapter ✅
- Legacy modules requiring refactoring:
  - Row + ScheduleAdapter (tightly coupled)
  - RideManager (business logic mixed with GAS)
  - Commands + UIManager + rowCheck (over-engineered)

#### Test Coverage
- Partial coverage (~60% of Core modules)
- 200+ passing tests
- Key modules with good coverage:
  - AnnouncementCore: 100%
  - TriggerManagerCore: 100%
  - RWGPSMembersCore: 100%

#### Known Issues
- Row class tightly coupled to SpreadsheetApp
- Business logic scattered across Commands/UIManager/rowCheck
- Some validation rules not tested
- Type definitions incomplete

---

## Version Numbering Convention

- *Development Workflow](docs/Development-workflow.md)
- [Copilot Instructions](.github/copilot-instructions.md)
