#!/usr/bin/env python3
"""
MinIO Hardware Calculator - Excel to JSON Converter
Converts Excel hardware specifications to CSV files and then to a consolidated JSON format.
"""

import pandas as pd
import json
import os
from pathlib import Path
import numpy as np

def clean_data(df):
    """Clean dataframe by removing empty columns and rows"""
    # Remove columns that are mostly empty (more than 90% NaN)
    df = df.loc[:, df.isnull().mean() < 0.9]
    
    # Remove rows that are completely empty
    df = df.dropna(how='all')
    
    # Fill NaN values with None for JSON compatibility
    df = df.where(pd.notnull(df), None)
    
    return df

def parse_capacity(capacity_str):
    """Parse capacity string to TB value"""
    if not capacity_str or pd.isna(capacity_str):
        return 0
    
    capacity_str = str(capacity_str).upper()
    
    if 'TB' in capacity_str:
        return float(capacity_str.replace('TB', ''))
    elif 'GB' in capacity_str:
        return float(capacity_str.replace('GB', '')) / 1000
    elif 'PB' in capacity_str:
        return float(capacity_str.replace('PB', '')) * 1000
    
    return 0

def parse_power(power_str):
    """Parse power string to extract active and idle power"""
    if not power_str or pd.isna(power_str):
        return {'active': 0, 'idle': 0}
    
    power_str = str(power_str)
    if '/' in power_str:
        try:
            active, idle = power_str.split('/')
            return {
                'active': float(active),
                'idle': float(idle)
            }
        except:
            return {'active': 0, 'idle': 0}
    
    return {'active': 0, 'idle': 0}

def convert_excel_to_csv(excel_file):
    """Convert Excel file to individual CSV files"""
    try:
        # Read all sheets
        excel_data = pd.read_excel(excel_file, sheet_name=None)
        
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        # Process each relevant sheet
        sheets_to_process = {
            'Chassis': 'chassis.csv',
            'CPUs': 'cpus.csv',
            'Memory': 'memory.csv',
            'StorageDrive': 'storage_drives.csv',
            'BootDrive': 'boot_drives.csv'
        }
        
        for sheet_name, csv_filename in sheets_to_process.items():
            if sheet_name in excel_data:
                df = excel_data[sheet_name]
                
                # Clean the data
                df = clean_data(df)
                
                if not df.empty:
                    # Save to CSV
                    df.to_csv(f'data/{csv_filename}', index=False)
                    print(f"✓ Converted {sheet_name} to {csv_filename}")
                else:
                    print(f"⚠ {sheet_name} sheet is empty or has no valid data")
            else:
                print(f"⚠ Sheet {sheet_name} not found in Excel file")
        
        print("CSV conversion completed!")
        
    except Exception as e:
        print(f"Error converting Excel to CSV: {e}")

def load_csv_data():
    """Load all CSV files into dictionaries"""
    data = {}
    
    csv_files = {
        'chassis': 'data/chassis.csv',
        'cpus': 'data/cpus.csv',
        'memory': 'data/memory.csv',
        'storage_drives': 'data/storage_drives.csv',
        'boot_drives': 'data/boot_drives.csv'
    }
    
    for key, filepath in csv_files.items():
        if os.path.exists(filepath):
            try:
                df = pd.read_csv(filepath)
                data[key] = df.to_dict('records')
                print(f"✓ Loaded {len(data[key])} records from {filepath}")
            except Exception as e:
                print(f"⚠ Error loading {filepath}: {e}")
                data[key] = []
        else:
            print(f"⚠ File {filepath} not found")
            data[key] = []
    
    return data

def process_chassis_data(chassis_data):
    """Process and structure chassis data"""
    processed = {}
    
    for item in chassis_data:
        vendor = item.get('Vendor') or item.get('Column_1')
        model = item.get('Model') or item.get('Column_2')
        
        if not vendor or not model:
            continue
            
        if vendor not in processed:
            processed[vendor] = {}
        
        # Determine size category based on form factor and drive bays
        form_factor = item.get('Form Factor') or item.get('Column_5')
        drive_bays = item.get('Drive Bay') or item.get('Column_6')
        
        size_category = 'medium'  # default
        if form_factor == '1U' and drive_bays and drive_bays <= 8:
            size_category = 'small'
        elif form_factor == '2U' or (drive_bays and drive_bays >= 24):
            size_category = 'large'
        
        processed[vendor][model] = {
            'model': model,
            'form_factor': form_factor,
            'drive_bays': drive_bays,
            'drive_types': item.get('Drive Type') or item.get('Column_7'),
            'cpu_sockets': item.get('CPU Sockets') or item.get('Column_4'),
            'memory_slots': item.get('Memory Slots') or item.get('Column_9'),
            'memory_max': item.get('Memory Max') or item.get('Column_10'),
            'size_category': size_category,
            'psu': item.get('PSU') or item.get('Column_12'),
            'depth': item.get('Depth') or item.get('Column_13'),
            'vendor_link': item.get('Vendor Link') or item.get('Column_14'),
            'notes': item.get('Notes') or item.get('Column_15'),
            'preferred': item.get('Preferred') or item.get('Column_0')
        }
    
    return processed

def process_storage_data(storage_data):
    """Process and structure storage drive data"""
    processed = []
    
    for item in storage_data:
        vendor = item.get('Vendor')
        model = item.get('Model')
        
        if not vendor or not model:
            continue
        
        capacity_tb = parse_capacity(item.get('Capacity'))
        power_info = parse_power(item.get('Power Active / Idle (W)'))
        
        processed.append({
            'vendor': vendor,
            'model': model,
            'part_number': item.get('Mfg Part #'),
            'nvme_gen': item.get('NVMe Gen'),
            'form_factor': item.get('Form Factor'),
            'interface': item.get('Interface'),
            'technology': item.get('Technology'),
            'capacity_tb': capacity_tb,
            'capacity_raw': item.get('Capacity'),
            'seq_read_mbps': item.get('Seq Read 128K (MB/s)'),
            'seq_write_mbps': item.get('Seq Write 128K (MB/s)'),
            'random_read_iops': item.get('Random Read 4K (IOPS)'),
            'random_write_iops': item.get('Random Write 4K (IOPS)'),
            'power_active_w': power_info['active'],
            'power_idle_w': power_info['idle'],
            'power_raw': item.get('Power Active / Idle (W)'),
            'tech_spec_url': item.get('Tech Spec Sheet'),
            'preferred': item.get('Preferred') or 0
        })
    
    return sorted(processed, key=lambda x: (x['preferred'] or 99, x['capacity_tb']))

def process_cpu_data(cpu_data):
    """Process and structure CPU data"""
    processed = []
    
    for item in cpu_data:
        vendor = item.get('Vendor')
        model = item.get('Model')
        
        if not vendor or not model:
            continue
        
        processed.append({
            'vendor': vendor,
            'model': model,
            'line': item.get('Line'),
            'cores': item.get('Cores'),
            'threads': item.get('Threads'),
            'boost_clock': item.get('Boost Clock'),
            'base_clock': item.get('Base Clock'),
            'l3_cache': item.get('L3 Cache'),
            'tdp': item.get('TDP'),
            'memory_type': item.get('Memory'),
            'memory_channels': item.get('DDR Channels'),
            'max_memory_freq': item.get('Max DDR Freq. (1DPC)'),
            'memory_bandwidth': item.get('Per-Socket Theoretical Memory Bandwidth'),
            'pcie_lanes': item.get('PCIe® Gen 5 Lanes'),
            'socket_support': item.get('2P/1P'),
            'generation': item.get('Gen'),
            'year': item.get('Year'),
            'codename': item.get('Codename'),
            'architecture': item.get('Architecture'),
            'socket': item.get('Socket'),
            'preferred': item.get('Preferred') or 0
        })
    
    return sorted(processed, key=lambda x: (x['preferred'] or 99, -(x['cores'] or 0)))

def process_memory_data(memory_data):
    """Process and structure memory data"""
    processed = []
    
    for item in memory_data:
        vendor = item.get('Vendor')
        model = item.get('Model')
        
        if not vendor or not model:
            continue
        
        # Parse size
        size_str = item.get('Size', '')
        size_gb = 0
        if size_str and 'GB' in str(size_str):
            try:
                size_gb = int(str(size_str).replace('GB', ''))
            except:
                pass
        
        processed.append({
            'vendor': vendor,
            'model': model,
            'description': item.get('Description'),
            'size_gb': size_gb,
            'size_raw': item.get('Size'),
            'speed': item.get('Speed'),
            'profile': item.get('Profile'),
            'preferred': item.get('Preferred') or 0
        })
    
    return sorted(processed, key=lambda x: (x['preferred'] or 99, x['size_gb']))

def create_hardware_json(data):
    """Create the main hardware specifications JSON structure"""
    hardware_specs = {
        'metadata': {
            'version': '1.0',
            'generated': pd.Timestamp.now().isoformat(),
            'description': 'MinIO Hardware Calculator - Hardware Specifications'
        },
        'vendors': {},
        'storage_drives': process_storage_data(data['storage_drives']),
        'cpus': process_cpu_data(data['cpus']),
        'memory': process_memory_data(data['memory']),
        'boot_drives': data['boot_drives'],
        'erasure_coding': {
            'default_scheme': 'EC 8:3',
            'schemes': {
                'EC 8:3': {
                    'data_blocks': 8,
                    'parity_blocks': 3,
                    'total_blocks': 11,
                    'efficiency': 8/11,  # ~72.7%
                    'min_drives': 11,
                    'fault_tolerance': 3
                },
                'EC 8:2': {
                    'data_blocks': 8,
                    'parity_blocks': 2,
                    'total_blocks': 10,
                    'efficiency': 8/10,  # 80%
                    'min_drives': 10,
                    'fault_tolerance': 2
                },
                'EC 8:4': {
                    'data_blocks': 8,
                    'parity_blocks': 4,
                    'total_blocks': 12,
                    'efficiency': 8/12,  # ~66.7%
                    'min_drives': 12,
                    'fault_tolerance': 4
                }
            }
        },
        'size_categories': {
            'small': {
                'description': '1U servers with 8-16 drive bays',
                'typical_form_factor': '1U',
                'drive_bay_range': [8, 16]
            },
            'medium': {
                'description': '1U servers with 16-24 drive bays',
                'typical_form_factor': '1U',
                'drive_bay_range': [16, 24]
            },
            'large': {
                'description': '2U servers with 24-32+ drive bays',
                'typical_form_factor': '2U',
                'drive_bay_range': [24, 64]
            }
        }
    }
    
    # Process chassis data by vendor
    chassis_data = process_chassis_data(data['chassis'])
    
    # Structure by vendor
    for vendor, models in chassis_data.items():
        hardware_specs['vendors'][vendor] = {
            'name': vendor,
            'chassis': models,
            'supported_sizes': list(set(model['size_category'] for model in models.values()))
        }
    
    return hardware_specs

def main():
    """Main function to orchestrate the conversion process"""
    excel_file = 'WIP Recommended HW Platforms.xlsx'
    json_file = 'data/hardware_specs.json'
    
    print("🚀 Starting MinIO Hardware Calculator data conversion...")
    
    # Step 1: Convert Excel to CSV
    if os.path.exists(excel_file):
        print(f"\n📊 Converting {excel_file} to CSV files...")
        convert_excel_to_csv(excel_file)
    else:
        print(f"⚠ Excel file {excel_file} not found. Please ensure it's in the current directory.")
        return
    
    # Step 2: Load CSV data
    print(f"\n📁 Loading CSV data...")
    data = load_csv_data()
    
    # Step 3: Create JSON structure
    print(f"\n🔧 Processing and structuring data...")
    hardware_specs = create_hardware_json(data)
    
    # Step 4: Save to JSON
    print(f"\n💾 Saving to {json_file}...")
    with open(json_file, 'w') as f:
        json.dump(hardware_specs, f, indent=2, default=str)
    
    print(f"✅ Conversion completed successfully!")
    print(f"📄 Generated files:")
    print(f"  - data/chassis.csv")
    print(f"  - data/cpus.csv")
    print(f"  - data/memory.csv")
    print(f"  - data/storage_drives.csv")
    print(f"  - data/boot_drives.csv")
    print(f"  - data/hardware_specs.json")
    
    # Print summary
    print(f"\n📈 Data Summary:")
    print(f"  - Vendors: {len(hardware_specs['vendors'])}")
    print(f"  - Storage Drives: {len(hardware_specs['storage_drives'])}")
    print(f"  - CPUs: {len(hardware_specs['cpus'])}")
    print(f"  - Memory Options: {len(hardware_specs['memory'])}")
    
    # Show sample configuration
    print(f"\n🎯 Sample 1PB Configuration:")
    print(f"  - Usable Capacity: 1PB")
    print(f"  - Erasure Coding: EC 8:3 (72.7% efficiency)")
    print(f"  - Raw Capacity Needed: ~1.38PB")
    print(f"  - Recommended: 8x Supermicro servers with 15.36TB drives")

if __name__ == "__main__":
    main()