#!/usr/bin/env python3
"""
MinIO Hardware Calculator - Data Validation Script
Validates the integrity and consistency of hardware specifications data.
"""

import json
import pandas as pd
import os
from pathlib import Path

def validate_json_structure(data):
    """Validate the basic structure of the hardware specs JSON"""
    errors = []
    warnings = []
    
    required_keys = ['metadata', 'vendors', 'storage_drives', 'cpus', 'memory', 'erasure_coding']
    for key in required_keys:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    
    if 'metadata' in data:
        metadata_keys = ['version', 'generated', 'description']
        for key in metadata_keys:
            if key not in data['metadata']:
                warnings.append(f"Missing metadata key: {key}")
    
    return errors, warnings

def validate_vendors(vendors_data):
    """Validate vendor data structure"""
    errors = []
    warnings = []
    
    if not vendors_data:
        errors.append("No vendor data found")
        return errors, warnings
    
    for vendor_name, vendor_data in vendors_data.items():
        if 'chassis' not in vendor_data:
            errors.append(f"Vendor {vendor_name} missing chassis data")
            continue
            
        if 'supported_sizes' not in vendor_data:
            warnings.append(f"Vendor {vendor_name} missing supported_sizes")
        
        chassis_count = len(vendor_data['chassis'])
        if chassis_count == 0:
            warnings.append(f"Vendor {vendor_name} has no chassis models")
        else:
            print(f"✓ Vendor {vendor_name}: {chassis_count} chassis models")
    
    return errors, warnings

def validate_storage_drives(drives_data):
    """Validate storage drive data"""
    errors = []
    warnings = []
    
    if not drives_data:
        errors.append("No storage drive data found")
        return errors, warnings
    
    required_fields = ['vendor', 'model', 'capacity_tb', 'seq_read_mbps', 'power_active_w']
    preferred_drives = []
    
    for i, drive in enumerate(drives_data):
        for field in required_fields:
            if field not in drive or drive[field] is None:
                errors.append(f"Drive {i}: Missing required field '{field}'")
        
        if drive.get('preferred', 0) <= 2:
            preferred_drives.append(drive)
        
        # Validate capacity is reasonable
        if drive.get('capacity_tb', 0) > 100:
            warnings.append(f"Drive {drive.get('model', 'unknown')}: Unusually high capacity ({drive.get('capacity_tb')}TB)")
        
        # Validate performance numbers
        if drive.get('seq_read_mbps', 0) > 10000:
            warnings.append(f"Drive {drive.get('model', 'unknown')}: Unusually high read speed ({drive.get('seq_read_mbps')} MB/s)")
    
    print(f"✓ Storage drives: {len(drives_data)} total, {len(preferred_drives)} preferred")
    
    return errors, warnings

def validate_cpus(cpus_data):
    """Validate CPU data"""
    errors = []
    warnings = []
    
    if not cpus_data:
        errors.append("No CPU data found")
        return errors, warnings
    
    required_fields = ['vendor', 'model', 'cores']
    preferred_cpus = []
    
    for i, cpu in enumerate(cpus_data):
        for field in required_fields:
            if field not in cpu or cpu[field] is None:
                errors.append(f"CPU {i}: Missing required field '{field}'")
        
        if cpu.get('preferred', 0) <= 2:
            preferred_cpus.append(cpu)
        
        # Validate core count is reasonable
        cores = cpu.get('cores', 0)
        if cores and cores > 128:
            warnings.append(f"CPU {cpu.get('model', 'unknown')}: Unusually high core count ({cores})")
    
    print(f"✓ CPUs: {len(cpus_data)} total, {len(preferred_cpus)} preferred")
    
    return errors, warnings

def validate_erasure_coding(ec_data):
    """Validate erasure coding schemes"""
    errors = []
    warnings = []
    
    if not ec_data or 'schemes' not in ec_data:
        errors.append("No erasure coding schemes found")
        return errors, warnings
    
    schemes = ec_data['schemes']
    required_schemes = ['EC 8:3', 'EC 8:2', 'EC 8:4']
    
    for scheme_name in required_schemes:
        if scheme_name not in schemes:
            warnings.append(f"Missing recommended scheme: {scheme_name}")
        else:
            scheme = schemes[scheme_name]
            # Validate efficiency calculation
            expected_efficiency = scheme['data_blocks'] / (scheme['data_blocks'] + scheme['parity_blocks'])
            actual_efficiency = scheme.get('efficiency', 0)
            
            if abs(expected_efficiency - actual_efficiency) > 0.001:
                errors.append(f"Scheme {scheme_name}: Efficiency mismatch (expected {expected_efficiency:.3f}, got {actual_efficiency:.3f})")
    
    print(f"✓ Erasure coding: {len(schemes)} schemes defined")
    
    return errors, warnings

def validate_consistency(data):
    """Validate data consistency across components"""
    errors = []
    warnings = []
    
    # Check that all chassis vendors exist in vendors list
    all_vendors = set(data.get('vendors', {}).keys())
    
    # Check storage drives
    drive_vendors = set()
    for drive in data.get('storage_drives', []):
        vendor = drive.get('vendor')
        if vendor:
            drive_vendors.add(vendor)
    
    # Check if drive vendors match chassis vendors
    missing_vendors = drive_vendors - all_vendors
    if missing_vendors:
        warnings.append(f"Drive vendors not in chassis vendors: {missing_vendors}")
    
    # Check for preferred options
    preferred_drives = [d for d in data.get('storage_drives', []) if d.get('preferred', 0) <= 2]
    if len(preferred_drives) < 3:
        warnings.append(f"Only {len(preferred_drives)} preferred drives available (recommend at least 3)")
    
    preferred_cpus = [c for c in data.get('cpus', []) if c.get('preferred', 0) <= 2]
    if len(preferred_cpus) < 2:
        warnings.append(f"Only {len(preferred_cpus)} preferred CPUs available (recommend at least 2)")
    
    return errors, warnings

def check_file_sizes():
    """Check if data files are reasonable sizes"""
    warnings = []
    
    json_file = 'public/data/hardware_specs.json'
    if os.path.exists(json_file):
        size_mb = os.path.getsize(json_file) / (1024 * 1024)
        if size_mb > 5:
            warnings.append(f"JSON file is large ({size_mb:.1f}MB) - may impact loading performance")
        elif size_mb < 0.1:
            warnings.append(f"JSON file is small ({size_mb:.1f}MB) - may have incomplete data")
        else:
            print(f"✓ JSON file size: {size_mb:.1f}MB")
    else:
        warnings.append("JSON file not found in public/data/")
    
    return warnings

def main():
    """Main validation function"""
    print("🔍 Starting MinIO Hardware Calculator data validation...")
    
    # Load the main JSON file
    json_file = 'public/data/hardware_specs.json'
    if not os.path.exists(json_file):
        json_file = 'data/hardware_specs.json'  # Fallback location
    
    if not os.path.exists(json_file):
        print(f"❌ Error: {json_file} not found. Run convert_to_json.py first.")
        return
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        print(f"✓ Loaded data from {json_file}")
    except Exception as e:
        print(f"❌ Error loading JSON file: {e}")
        return
    
    all_errors = []
    all_warnings = []
    
    # Run validations
    print("\n📋 Validating data structure...")
    errors, warnings = validate_json_structure(data)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n🏢 Validating vendors...")
    errors, warnings = validate_vendors(data.get('vendors', {}))
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n💾 Validating storage drives...")
    errors, warnings = validate_storage_drives(data.get('storage_drives', []))
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n🖥️ Validating CPUs...")
    errors, warnings = validate_cpus(data.get('cpus', []))
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n🔧 Validating erasure coding...")
    errors, warnings = validate_erasure_coding(data.get('erasure_coding', {}))
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n🔗 Validating consistency...")
    errors, warnings = validate_consistency(data)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    
    print("\n📏 Checking file sizes...")
    warnings = check_file_sizes()
    all_warnings.extend(warnings)
    
    # Summary
    print(f"\n📊 Validation Summary:")
    print(f"  - Total Vendors: {len(data.get('vendors', {}))}")
    print(f"  - Total Storage Drives: {len(data.get('storage_drives', []))}")
    print(f"  - Total CPUs: {len(data.get('cpus', []))}")
    print(f"  - Total Memory Options: {len(data.get('memory', []))}")
    print(f"  - Erasure Coding Schemes: {len(data.get('erasure_coding', {}).get('schemes', {}))}")
    
    if all_errors:
        print(f"\n❌ Errors found ({len(all_errors)}):")
        for error in all_errors:
            print(f"  - {error}")
    
    if all_warnings:
        print(f"\n⚠️ Warnings ({len(all_warnings)}):")
        for warning in all_warnings:
            print(f"  - {warning}")
    
    if not all_errors and not all_warnings:
        print("\n✅ All validations passed!")
    elif not all_errors:
        print(f"\n✅ Validation completed with {len(all_warnings)} warnings")
    else:
        print(f"\n❌ Validation failed with {len(all_errors)} errors and {len(all_warnings)} warnings")
    
    return len(all_errors) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)