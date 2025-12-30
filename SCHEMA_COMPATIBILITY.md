# SupplyFind Schema Compatibility

## Overview

This document describes the schema compatibility updates made to Price-Cal to support the reorganized SupplyFind repository structure and new metadata fields.

## Changes Made

### 1. TypeScript Interface Updates

#### Branch Type
Added the following optional fields to the `Branch` type in `app/supply/page.tsx`:

- **`postalCode?: string`** - Alternative to `zip` field for postal code
- **`sources?: string[]`** - Array of data source URLs
- **`operatingName?: string`** - Local operating name when different from chain name (e.g., "KVA Supply Co" for WESCO)
- **`verification?: object`** - Geocoding and address verification metadata
  - `coords_verified?: string` - Date coordinates were verified
  - `geocoding_method?: string` - Method used for geocoding
  - `notes?: string` - Verification notes
  - `addressVerified?: boolean` - Whether address was verified
  - `addressSource?: string` - Source of address data
  - `addressVerifiedDate?: string` - Date address was verified
- **`coordsStatus?: string`** - Status of coordinate verification (e.g., "verified")

#### MetroFile Type
Added audit metadata fields to the `MetroFile` type:

- **`version?: string`** - Data file version
- **`updated?: string`** - Last update date
- **`auditStatus?: string`** - Audit status (e.g., "in_progress", "complete")
- **`auditNotes?: string[]`** - Array of audit notes
- **`state?: string`** - State code
- **`metro?: string`** - Metro area name

### 2. Postal Code Compatibility

#### Problem
SupplyFind data may use either `zip` or `postalCode` field names for postal codes.

#### Solution
- Changed `zip` field from required to optional: `zip?: string`
- Added new optional field: `postalCode?: string`
- Created `getPostalCode(branch: Branch)` helper function that:
  - Tries `zip` first
  - Falls back to `postalCode`
  - Returns empty string if neither exists

#### Updated Functions
- `formatAddress()` - Now uses `getPostalCode()` helper
- Address display in UI - Now uses `getPostalCode()` helper
- Search filter - Now uses `getPostalCode()` helper

### 3. Error Handling Improvements

#### Branch Validation
Added validation when loading branch data:
```typescript
if (!b?.id || !b?.name || !Number.isFinite(b?.lat) || !Number.isFinite(b?.lon)) {
  loadErrors.push(`Invalid branch in ${metroRel}: missing required fields`);
  continue;
}
```

#### Audit Status Logging
Added informational logging for files in audit status:
```typescript
if (metro.data.auditStatus && metro.data.auditStatus !== 'complete') {
  console.info(`[SupplyFind] Metro file ${metroRel} has audit status: ${metro.data.auditStatus}`);
}
```

## File Paths

### In Price-Cal Repository
- Local data files: `supplyfind-updates/us/co/...`
- Used by: `verify_wesco_cleanup.py` verification script

### In SupplyFind Repository
- Base path: `supply-house-directory`
- Referenced by: Application code (`BASE_PATH` constant)
- Fetched from GitHub at runtime

## Backward Compatibility

All changes are **backward compatible**:

- New fields are optional
- Old `zip` field still works
- Graceful degradation when fields are missing
- No breaking changes to existing functionality

## Verification

### Build Test
```bash
npm run build
# ✓ Compiled successfully
```

### Lint Test
```bash
npm run lint
# ✔ No ESLint warnings or errors
```

### Data Integrity Test
```bash
python3 verify_wesco_cleanup.py
# ✅ ALL CHECKS PASSED
```

## Usage Examples

### Accessing Postal Code
```typescript
// Old way (still works)
const zip1 = branch.zip;

// New way (recommended)
const zip2 = getPostalCode(branch);
```

### Accessing Operating Name
```typescript
// Display name vs operating name
const displayName = branch.name;           // "KVA Supply Co"
const chainName = branch.chain;            // "WESCO"
const operatingName = branch.operatingName; // "KVA Supply Co"
```

### Accessing Verification Data
```typescript
if (branch.verification?.coords_verified) {
  console.log(`Coordinates verified: ${branch.verification.coords_verified}`);
}

if (branch.coordsStatus === 'verified') {
  console.log('Coordinates are verified');
}
```

## Related Documentation

- [WESCO Cleanup Summary](WESCO_CLEANUP_SUMMARY.md)
- [WESCO Cleanup README](README_WESCO_CLEANUP.md)
- [Quick Start Guide](QUICKSTART.md)

## Future Considerations

1. **Standardize on `postalCode`**: Consider migrating all uses to `postalCode` for consistency
2. **TypeScript Strict Mode**: Consider enabling strict null checks for better type safety
3. **Schema Validation**: Consider adding runtime schema validation using a library like Zod
4. **Testing**: Consider adding unit tests for helper functions like `getPostalCode()`

## Version History

- **2025-12-27**: Initial schema compatibility updates
  - Added new SupplyFind fields
  - Added postal code fallback mechanism
  - Added error handling improvements
