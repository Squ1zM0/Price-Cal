# SupplyFind Data Updates - WESCO Cleanup

This directory contains the modified SupplyFind data files with corrected WESCO entries.

## Purpose

These files have been updated to fix WESCO entries per the issue requirements:
- Remove invalid/duplicate WESCO branches
- Update Denver WESCO to KVA Supply Co branding
- Retain only verified locations (Denver KVA Supply Co, Pueblo WESCO)

## Files Included

```
us/co/
├── denver-metro.json              (1 WESCO entry removed, 1 updated to KVA Supply Co)
└── electrical/
    ├── denver-metro.json          (2 WESCO entries removed, 1 updated to KVA Supply Co)
    ├── front-range-north.json     (1 WESCO entry removed - Fort Collins)
    └── pueblo-south.json          (1 WESCO entry retained - Pueblo)
```

## How to Apply These Changes

### Option 1: Manual Copy to SupplyFind Repository

1. Clone the SupplyFind repository:
   ```bash
   git clone https://github.com/Squ1zM0/SupplyFind.git
   ```

2. Copy these files to the corresponding locations in SupplyFind:
   ```bash
   cp us/co/denver-metro.json SupplyFind/supply-house-directory/us/co/
   cp us/co/electrical/*.json SupplyFind/supply-house-directory/us/co/electrical/
   ```

3. Commit and push to SupplyFind:
   ```bash
   cd SupplyFind
   git add supply-house-directory/us/co/
   git commit -m "Fix WESCO entries - Remove invalid branches, update Denver to KVA Supply Co"
   git push
   ```

### Option 2: Use the Branch in SupplyFind

A branch has been created in the SupplyFind repository with these changes:
- **Branch name:** `fix-wesco-kva-supply-entries`
- **Repository:** Squ1zM0/SupplyFind

To use this branch:
1. Checkout the branch in SupplyFind
2. Review the changes
3. Merge to main

## Changes Summary

- **Removed 4 invalid entries:**
  - Fort Collins WESCO (invalid location)
  - Denver 756 S Jason St (invalid duplicate)
  - Denver 6883 E 47th Ave (Carlton-Bates subsidiary, not WESCO branch)
  - Duplicate entry in denver-metro.json

- **Updated 1 entry:**
  - Denver 11198 E 45th Ave: WESCO → KVA Supply Co

- **Retained 1 entry:**
  - Pueblo 115 S Main St: WESCO

## Verification

All changes have been verified against:
- WESCO official website
- Google Maps
- Business directories
- Ground truth verification date: 2025-12-27

See `../WESCO_CLEANUP_SUMMARY.md` for detailed documentation.
