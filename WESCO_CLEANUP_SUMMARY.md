# WESCO (KVA Supply) Data Cleanup Summary

**Issue:** Fix WESCO (KVA Supply) Entries — Remove Invalid & Duplicate Branches, Normalize Canonical Locations

**Date:** 2025-12-27

**Status:** ✅ COMPLETED

---

## Changes Made to SupplyFind Repository

The following changes were made to the SupplyFind repository data files to ensure accurate WESCO representation in Colorado.

### Verified Ground Truth

Only **2 valid WESCO locations** exist in Colorado:

1. **Denver** - KVA Supply Co (WESCO subsidiary)
   - Address: 11198 E 45th Ave, Suite 150, Denver, CO 80239
   - Phone: (303) 217-7500
   - Google Maps: https://maps.app.goo.gl/y2nsHYLPrUabmM3BA
   - Operating Name: KVA Supply Co
   - Parent Company: WESCO

2. **Pueblo** - WESCO Distribution Inc
   - Address: 115 S Main St, Pueblo, CO 81003
   - Phone: (719) 545-1141
   - Operating Name: WESCO

---

## Files Modified

### 1. `supply-house-directory/us/co/denver-metro.json`
- ✅ **UPDATED:** WESCO Denver (11198 E 45th Ave) → **KVA Supply Co**
  - Updated name to "KVA Supply Co"
  - Updated phone to 303-217-7500
  - Added `operatingName` field
  - Enhanced notes to explain KVA/WESCO relationship
  - Added Google Maps verification link
  - Fixed ZIP code to 80239
  
- ❌ **REMOVED:** WESCO Retail Branch - Denver (756 S Jason St Unit 1)
  - Reason: Invalid location, does not exist as verified WESCO branch

### 2. `supply-house-directory/us/co/electrical/denver-metro.json`
- ✅ **UPDATED:** WESCO Denver (11198 E 45th Ave) → **KVA Supply Co**
  - Same updates as above
  
- ❌ **REMOVED:** WESCO Retail Branch - Denver (756 S Jason St Unit 1)
  - Reason: Invalid location, duplicate entry
  
- ❌ **REMOVED:** WESCO - Denver (E 47th Ave) (6883 E 47th Ave Dr)
  - Reason: This is Carlton-Bates Company (WESCO subsidiary), not a WESCO branch

### 3. `supply-house-directory/us/co/electrical/front-range-north.json`
- ❌ **REMOVED:** WESCO - Fort Collins (133 Commerce Dr)
  - Reason: Invalid location per ground truth verification

### 4. `supply-house-directory/us/co/electrical/pueblo-south.json`
- ✅ **RETAINED:** WESCO - Pueblo (115 S Main St)
  - Updated last_verified to 2025-12-27
  - Fixed ZIP code to 81003

---

## Summary of Removals

**Total Removed:** 4 invalid/duplicate entries

| ID | Name | Address | City | Reason |
|----|------|---------|------|--------|
| `co-denver-electrical-wesco-retail-denver-756-s-jason` | WESCO Retail Branch - Denver | 756 S Jason St Unit 1 | Denver | Invalid location |
| `wesco-retail-denver-756-s-jason` | WESCO Retail Branch - Denver | 756 S Jason St Unit 1 | Denver | Duplicate/Invalid |
| `wesco-denver-6883-e-47th` | WESCO - Denver (E 47th Ave) | 6883 E 47th Ave Dr | Denver | Carlton-Bates subsidiary, not WESCO branch |
| `wesco-fort-collins-133-commerce` | WESCO - Fort Collins | 133 Commerce Dr | Fort Collins | Invalid location |

---

## KVA Supply Co Details

The Denver entry has been properly normalized to reflect actual signage and operation:

```json
{
  "name": "KVA Supply Co",
  "chain": "WESCO",
  "operatingName": "KVA Supply Co",
  "address1": "11198 E 45th Ave",
  "city": "Denver",
  "state": "CO",
  "zip": "80239",
  "phone": "303-217-7500",
  "notes": "KVA Supply Co - WESCO subsidiary operating under KVA branding. Specializes in electrical supplies, particularly medium-voltage underground material. Offers custom kitting, technical support, project packaging, and value-added services for utility and construction sectors. Source: WESCO/KVA Supply official listings, verified 2025-12-27. Google Maps: https://maps.app.goo.gl/y2nsHYLPrUabmM3BA",
  "last_verified": "2025-12-27"
}
```

---

## Acceptance Criteria

- ✅ Only two WESCO-related entries remain in Colorado
- ✅ Denver entry correctly reflects KVA Supply Co (WESCO)
- ✅ Pueblo entry correctly reflects WESCO
- ✅ All invalid/duplicate branches removed
- ✅ No phantom locations remain
- ✅ Dataset accurately reflects real-world WESCO footprint
- ✅ Metadata updated with verification dates and sources
- ✅ Canonical naming normalized (KVA Supply Co with WESCO as parent)

---

## Next Steps

The changes have been committed to a branch in the SupplyFind repository:
- Branch: `fix-wesco-kva-supply-entries`
- Commit: Contains all 4 file modifications

**To deploy these changes:**
1. Review the changes in the SupplyFind repository
2. Merge the branch to main in SupplyFind
3. The Price-Cal app will automatically fetch the updated data from SupplyFind

---

## Verification Sources

- WESCO official website: https://www.wesco.com
- KVA Supply Co (WESCO): https://buy.wesco.com/content/kvasupply
- Google Maps (KVA Supply Co Denver): https://maps.app.goo.gl/y2nsHYLPrUabmM3BA
- Multiple business directories confirming addresses and phone numbers
- Ground truth verification date: 2025-12-27

---

## Impact

This cleanup ensures:
- ✅ Contractor trust maintained with accurate listings
- ✅ No wasted drive time to non-existent locations
- ✅ Directory credibility improved
- ✅ Proper representation of WESCO's local-brand operations (KVA)
- ✅ Standard set for handling national chains with local branding
