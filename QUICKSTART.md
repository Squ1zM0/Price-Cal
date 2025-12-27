# WESCO Cleanup - Quick Start Guide

## ✅ What Was Done

All WESCO entries in Colorado have been audited and corrected. Only **2 verified locations** now remain:

1. **Denver** - KVA Supply Co (11198 E 45th Ave)
2. **Pueblo** - WESCO (115 S Main St)

**Removed:** 4 invalid/duplicate entries  
**Updated:** 1 entry (Denver WESCO → KVA Supply Co)  
**Retained:** 1 entry (Pueblo WESCO)

## 🚀 Quick Verification

```bash
python3 verify_wesco_cleanup.py
```

Expected output: `✅ ALL CHECKS PASSED`

## 📁 What's Included

1. **`README_WESCO_CLEANUP.md`** - Full implementation guide
2. **`WESCO_CLEANUP_SUMMARY.md`** - Detailed change log
3. **`verify_wesco_cleanup.py`** - Verification script
4. **`supplyfind-updates/`** - Updated data files ready to deploy

## 🎯 Next Steps

### Step 1: Verify Changes
```bash
cd Price-Cal
python3 verify_wesco_cleanup.py
```

### Step 2: Apply to SupplyFind

**Option A: Use Pre-Created Branch (Recommended)**
```bash
cd ../SupplyFind  # Or clone if needed
git fetch origin
git checkout fix-wesco-kva-supply-entries
git merge main  # Resolve any conflicts
git checkout main
git merge fix-wesco-kva-supply-entries
git push
```

**Option B: Copy Files Manually**
```bash
cd ../SupplyFind  # Or clone: git clone https://github.com/Squ1zM0/SupplyFind.git
cp ../Price-Cal/supplyfind-updates/us/co/denver-metro.json supply-house-directory/us/co/
cp ../Price-Cal/supplyfind-updates/us/co/electrical/*.json supply-house-directory/us/co/electrical/
git add supply-house-directory/us/co/
git commit -m "Fix WESCO entries - Remove invalid branches, normalize KVA Supply Co"
git push
```

### Step 3: Verify Deployment

Once merged to SupplyFind main branch:
- Price-Cal app will automatically fetch updated data
- Search for "WESCO" or "KVA" in the Supply Houses page
- Should see only 2 locations in Colorado

## ❓ Questions?

See detailed documentation:
- **Full Guide:** `README_WESCO_CLEANUP.md`
- **Change Summary:** `WESCO_CLEANUP_SUMMARY.md`

## 📊 Visual Summary

**Before:** 6 entries (4 invalid)  
**After:** 2 unique locations (3 total entries due to metro + trade file structure)

✅ **Denver - KVA Supply Co** (correctly branded)  
✅ **Pueblo - WESCO** (verified location)

---

**Status:** ✅ Complete  
**Date:** 2025-12-27  
**Verification:** All automated checks passing
