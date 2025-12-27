#!/usr/bin/env python3
"""
WESCO Cleanup Verification Script

This script verifies that all WESCO entries in the Colorado data files
have been properly cleaned up according to the issue requirements.

Expected state:
- Only 2 WESCO-related entries in all of Colorado
- Denver: KVA Supply Co (11198 E 45th Ave)
- Pueblo: WESCO (115 S Main St)
"""

import json
import os
from pathlib import Path

def verify_wesco_cleanup():
    """Verify WESCO cleanup across all Colorado data files"""
    
    base_dir = Path("supplyfind-updates/us/co")
    
    if not base_dir.exists():
        print("❌ Error: supplyfind-updates directory not found")
        print("   Make sure you're running this from the Price-Cal repository root")
        return False
    
    # Files to check
    files_to_check = [
        base_dir / "denver-metro.json",
        base_dir / "electrical" / "denver-metro.json",
        base_dir / "electrical" / "front-range-north.json",
        base_dir / "electrical" / "pueblo-south.json",
        base_dir / "electrical" / "colorado-springs-metro.json",
        base_dir / "electrical" / "boulder-broomfield-longmont.json",
    ]
    
    all_wesco_entries = []
    total_branches = 0
    
    print("=" * 80)
    print("WESCO CLEANUP VERIFICATION")
    print("=" * 80)
    print()
    
    for filepath in files_to_check:
        if not filepath.exists():
            continue
            
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        branches = data.get('branches', [])
        total_branches += len(branches)
        
        wesco_entries = [
            b for b in branches 
            if 'WESCO' in b.get('chain', '') 
            or 'WESCO' in b.get('name', '')
            or 'KVA' in b.get('name', '')
        ]
        
        if wesco_entries:
            print(f"📁 {filepath.relative_to('supplyfind-updates')}")
            print(f"   Total branches: {len(branches)}")
            print(f"   WESCO/KVA entries: {len(wesco_entries)}")
            
            for entry in wesco_entries:
                all_wesco_entries.append({
                    'file': str(filepath.relative_to('supplyfind-updates')),
                    'name': entry.get('name'),
                    'chain': entry.get('chain'),
                    'city': entry.get('city'),
                    'address': entry.get('address1'),
                    'phone': entry.get('phone'),
                    'verified': entry.get('last_verified'),
                    'operating_name': entry.get('operatingName')
                })
                
                print(f"   └─ {entry.get('name')}")
                print(f"      Chain: {entry.get('chain')}")
                print(f"      Address: {entry.get('address1')}, {entry.get('city')}")
            print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total branches scanned: {total_branches}")
    print(f"Total WESCO/KVA entries found: {len(all_wesco_entries)}")
    print()
    
    # Deduplicate by address (same location can appear in metro and trade files)
    unique_locations = {}
    for entry in all_wesco_entries:
        key = f"{entry['city']}-{entry['address']}"
        if key not in unique_locations:
            unique_locations[key] = entry
    
    print(f"Unique WESCO/KVA locations: {len(unique_locations)}")
    print()
    
    # Verify expectations
    success = True
    
    if len(unique_locations) != 2:
        print(f"❌ FAIL: Expected exactly 2 unique WESCO locations, found {len(unique_locations)}")
        success = False
    else:
        print("✅ PASS: Exactly 2 unique WESCO/KVA locations found")
        print("   (Note: Entries may appear in both metro and trade-specific files)")
    
    # Check Denver KVA Supply Co (may appear in multiple files)
    denver_kva = [
        e for e in all_wesco_entries 
        if e['city'] == 'Denver' and '11198 E 45th' in e['address']
    ]
    
    if len(denver_kva) < 1:
        print(f"❌ FAIL: Expected at least 1 Denver KVA Supply Co entry, found {len(denver_kva)}")
        success = False
    else:
        # Check all Denver KVA entries are consistent
        entry = denver_kva[0]
        all_consistent = all(
            e['name'] == 'KVA Supply Co' and e['chain'] == 'WESCO'
            for e in denver_kva
        )
        
        if not all_consistent:
            print(f"❌ FAIL: Denver KVA Supply Co entries are inconsistent")
            success = False
        elif entry['name'] != 'KVA Supply Co':
            print(f"❌ FAIL: Denver entry name is '{entry['name']}', expected 'KVA Supply Co'")
            success = False
        elif entry['chain'] != 'WESCO':
            print(f"❌ FAIL: Denver entry chain is '{entry['chain']}', expected 'WESCO'")
            success = False
        elif entry['operating_name'] != 'KVA Supply Co':
            print(f"⚠️  WARNING: Denver entry missing 'operatingName' field")
        else:
            print("✅ PASS: Denver KVA Supply Co entry correctly configured")
            print(f"   Name: {entry['name']}")
            print(f"   Chain: {entry['chain']}")
            print(f"   Operating Name: {entry.get('operating_name', 'N/A')}")
            print(f"   Phone: {entry['phone']}")
            if len(denver_kva) > 1:
                print(f"   (Appears in {len(denver_kva)} files - metro + trade)")
    
    # Check Pueblo WESCO
    pueblo_wesco = [
        e for e in all_wesco_entries 
        if e['city'] == 'Pueblo' and '115 S Main' in e['address']
    ]
    
    if len(pueblo_wesco) != 1:
        print(f"❌ FAIL: Expected 1 Pueblo WESCO entry, found {len(pueblo_wesco)}")
        success = False
    else:
        entry = pueblo_wesco[0]
        if entry['chain'] != 'WESCO':
            print(f"❌ FAIL: Pueblo entry chain is '{entry['chain']}', expected 'WESCO'")
            success = False
        else:
            print("✅ PASS: Pueblo WESCO entry correctly retained")
            print(f"   Name: {entry['name']}")
            print(f"   Phone: {entry['phone']}")
    
    # Check for invalid entries
    print()
    print("Checking for removed entries...")
    invalid_addresses = [
        '756 S Jason',
        '6883 E 47th',
        '133 Commerce'  # Fort Collins
    ]
    
    for addr in invalid_addresses:
        found = [e for e in all_wesco_entries if addr in e['address']]
        if found:
            print(f"❌ FAIL: Found entry that should have been removed: {addr}")
            success = False
        else:
            print(f"✅ PASS: Confirmed removed: {addr}")
    
    print()
    print("=" * 80)
    
    if success:
        print("✅ ALL CHECKS PASSED")
        print()
        print("The WESCO cleanup has been successfully completed!")
        print("Only 2 verified WESCO locations remain:")
        print("  1. Denver - KVA Supply Co (11198 E 45th Ave)")
        print("  2. Pueblo - WESCO (115 S Main St)")
    else:
        print("❌ SOME CHECKS FAILED")
        print()
        print("Please review the errors above and correct the data files.")
    
    print("=" * 80)
    
    return success

if __name__ == "__main__":
    import sys
    success = verify_wesco_cleanup()
    sys.exit(0 if success else 1)
