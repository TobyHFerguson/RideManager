# Task 10.1.1: RWGPSClient.js Coverage Analysis

## Executive Summary
**Current Coverage**: 76.19% statements (272/357)  
**Target**: 90%+  
**Gap**: Need +48 more statements (14.8%)

**Breakdown**:
- Statements: 76.19% (272/357) - need ~+48 more
- Branches: 65.46% (127/194) - need ~+28 more  
- Functions: 92% (23/25) - 2 untested functions
- Lines: 76.57% (268/350) - need ~+47 more

---

## Uncovered Line Ranges (Detailed Analysis)

### 1. Lines 197-206 (10 lines) - Basic Auth Header Preparation
**Method**: `_prepareRequest()`  
**Issue**: BASIC_AUTH header construction not tested  
**Impact**: LOW (utility code)  
**Priority**: MEDIUM (3)  
**Solution**: Add test with BASIC_AUTH auth type

### 2. Line 220 (1 line) - Response Logging
**Method**: `_prepareRequest()`  
**Issue**: Console logging line  
**Impact**: VERY LOW (debug code)  
**Priority**: LOW (4)  
**Solution**: Can skip (debugging)

### 3. Line 268 (1 line) - HTTP Fetch Wrapper
**Method**: `_fetch()`  
**Issue**: Fetch wrapper method  
**Impact**: MEDIUM (used by all HTTP operations)  
**Priority**: MEDIUM (3)  
**Solution**: Add test calling _fetch directly

### 4. Lines 302-330 (29 lines) - createEvent Web API
**Method**: `createEvent()`  
**Issue**: Web API event creation (not v1 API tested currently)  
**Impact**: HIGH (core functionality)  
**Priority**: HIGH (1)  
**Solution**: Add test for createEvent() with multipart logo  

### 5. Line 413 (1 line) - createEvent Error Path
**Method**: `createEvent()` error handling  
**Issue**: Specific error condition not tested  
**Impact**: MEDIUM  
**Priority**: MEDIUM (3)  
**Solution**: Add test that triggers error in createEvent

### 6. Line 473 (1 line) - updateEventLogo Implementation
**Method**: `updateEventLogo()`  
**Issue**: This method is NOT TESTED  
**Impact**: HIGH (user-facing feature)  
**Priority**: HIGH (1)  
**Solution**: Add comprehensive tests for updateEventLogo()

### 7. Lines 583-585 (3 lines) - setRouteExpiration
**Method**: `setRouteExpiration()`  
**Issue**: Advanced route operations not tested  
**Impact**: MEDIUM (specific feature)  
**Priority**: MEDIUM (2)  
**Solution**: Add test for setRouteExpiration()

### 8. Lines 651-652 (2 lines) - getClubMembers Error
**Method**: `getClubMembers()`  
**Issue**: Error path not tested  
**Impact**: MEDIUM (error handling)  
**Priority**: MEDIUM (2)  
**Solution**: Add error test for getClubMembers()

### 9. Lines 709-821 (113 lines) - LARGE UNCOVERED BLOCK
**Methods**: updateEventLogo() implementation (main body)  
**Issue**: Entire method body uncovered  
**Impact**: VERY HIGH (core feature)  
**Priority**: CRITICAL (1)  
**Solution**: Add tests covering:
  - Login flow
  - Event ID extraction
  - Logo fetching from Google Drive
  - Multipart payload building
  - Logo upload to RWGPS
  - Error handling at each step

### 10. Lines 882-883 (2 lines) - Error Handling
**Issue**: Exception handling path  
**Priority**: MEDIUM (3)

### 11. Lines 928-929 (2 lines) - Error Handling
**Issue**: Exception handling path  
**Priority**: MEDIUM (3)

### 12. Lines 967-968 (2 lines) - Error Handling
**Issue**: Exception handling path  
**Priority**: MEDIUM (3)

### 13. Lines 1056-1057 (2 lines) - Error Handling
**Issue**: Exception handling path  
**Priority**: MEDIUM (3)

### 14. Lines 1108-1109 (2 lines) - Error Handling
**Issue**: Exception handling path  
**Priority**: MEDIUM (3)

---

## Two Untested Functions (92% = 23/25)
Need to identify which 2 functions aren't tested:
- Likely: `updateEventLogo()` (lines 709-821)
- Likely: One other method

---

## Recommended Test Addition Order (by Impact)

### Phase 1: Cover Largest Gap (113 lines)
- **Task 10.1.2**: `updateEventLogo()` comprehensive tests
  - Login success/failure
  - Event ID extraction
  - Logo fetching from Drive
  - Multipart payload
  - Upload success/failure
  - Error handling

### Phase 2: Cover Major Methods
- **Task 10.1.3**: `setRouteExpiration()` tests
- **Task 10.1.4**: `getClubMembers()` pagination tests (already has some coverage)
- **Task 10.1.5**: Error handling paths (multiple error tests)

### Phase 3: Cover Edge Cases
- **Task 10.1.2**: Basic Auth tests (`_prepareRequest` BASIC_AUTH)
- **Task 10.1.2**: `createEvent()` tests (web API)

---

## Estimated Effort
- **updateEventLogo() tests**: 30-40 lines of test code (covers 113 uncovered lines)
- **setRouteExpiration() tests**: 10-15 lines of test code
- **Error handling tests**: 15-20 lines of test code
- **Total**: ~60-75 lines of new test code needed

---

## Next Steps
1. Task 10.1.2: Write tests for `updateEventLogo()` (TDD approach)
2. Task 10.1.3: Write tests for `setRouteExpiration()`
3. Task 10.1.4: Enhance `getClubMembers()` tests
4. Task 10.1.5: Add comprehensive error handling tests
5. Verify coverage reaches 90%+ before committing
