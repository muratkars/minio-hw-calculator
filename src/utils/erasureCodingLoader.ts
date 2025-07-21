/**
 * MinIO Erasure Coding Configuration Loader
 * Loads erasure coding options from CSV with MinIO's official algorithm
 */

import { ErasureCodingScheme } from './calculations';

export interface ErasureCodeOption {
  scheme_name: string;
  data_shards: number;
  parity_shards: number;
  total_shards: number;
  storage_efficiency: number;
  fault_tolerance: number;
  min_drives: number;
  recommended: boolean;
  drive_distribution: number;
  description: string;
}

/**
 * Parse CSV content into erasure coding options
 */
function parseCSV(csvContent: string): ErasureCodeOption[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const option: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      switch (header.trim()) {
        case 'scheme_name':
        case 'description':
          option[header.trim()] = value.replace(/"/g, '');
          break;
        case 'recommended':
          option[header.trim()] = value.toLowerCase() === 'true';
          break;
        case 'data_shards':
        case 'parity_shards':
        case 'total_shards':
        case 'fault_tolerance':
        case 'min_drives':
        case 'drive_distribution':
          option[header.trim()] = parseInt(value);
          break;
        case 'storage_efficiency':
          option[header.trim()] = parseFloat(value);
          break;
        default:
          option[header.trim()] = value;
      }
    });
    
    return option as ErasureCodeOption;
  });
}

/**
 * Load erasure coding options from CSV file
 */
export async function loadErasureCodingOptions(): Promise<ErasureCodeOption[]> {
  try {
    const response = await fetch('/data/ec_options.csv');
    if (!response.ok) {
      throw new Error(`Failed to load erasure coding options: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Error loading erasure coding options:', error);
    
    // Fallback to default options based on MinIO documentation
    return getDefaultErasureCodingOptions();
  }
}

/**
 * Get default erasure coding options (fallback)
 */
export function getDefaultErasureCodingOptions(): ErasureCodeOption[] {
  return [
    {
      scheme_name: 'EC8:3',
      data_shards: 8,
      parity_shards: 3,
      total_shards: 11,
      storage_efficiency: 0.727,
      fault_tolerance: 3,
      min_drives: 11,
      recommended: true,
      drive_distribution: 11,
      description: '8+3 - Recommended balanced configuration'
    },
    {
      scheme_name: 'EC12:4',
      data_shards: 12,
      parity_shards: 4,
      total_shards: 16,
      storage_efficiency: 0.750,
      fault_tolerance: 4,
      min_drives: 16,
      recommended: true,
      drive_distribution: 16,
      description: '12+4 - Recommended for large deployments'
    },
    {
      scheme_name: 'EC8:2',
      data_shards: 8,
      parity_shards: 2,
      total_shards: 10,
      storage_efficiency: 0.800,
      fault_tolerance: 2,
      min_drives: 10,
      recommended: false,
      drive_distribution: 10,
      description: '8+2 - Very high efficiency with dual drive protection'
    },
    {
      scheme_name: 'EC8:4',
      data_shards: 8,
      parity_shards: 4,
      total_shards: 12,
      storage_efficiency: 0.667,
      fault_tolerance: 4,
      min_drives: 12,
      recommended: false,
      drive_distribution: 12,
      description: '8+4 - Maximum protection for critical data'
    }
  ];
}

/**
 * Convert ErasureCodeOption to ErasureCodingScheme for backward compatibility
 */
export function convertToScheme(option: ErasureCodeOption): ErasureCodingScheme {
  return {
    scheme_name: option.scheme_name,
    data_shards: option.data_shards,
    parity_shards: option.parity_shards,
    total_shards: option.total_shards,
    storage_efficiency: option.storage_efficiency,
    fault_tolerance: option.fault_tolerance,
    min_drives: option.min_drives,
    recommended: option.recommended,
    drive_distribution: option.drive_distribution,
    description: option.description,
    // Legacy support
    data_blocks: option.data_shards,
    parity_blocks: option.parity_shards,
    total_blocks: option.total_shards,
    efficiency: option.storage_efficiency
  };
}

/**
 * Get recommended erasure coding scheme based on MinIO best practices
 * @param totalDrives - Total number of drives in the cluster
 * @param faultToleranceRequired - Minimum fault tolerance required
 */
export function getRecommendedScheme(
  totalDrives: number,
  faultToleranceRequired: number = 3
): ErasureCodeOption | null {
  const options = getDefaultErasureCodingOptions();
  
  // Filter by minimum drives and fault tolerance
  const suitable = options.filter(option => 
    option.min_drives <= totalDrives && 
    option.fault_tolerance >= faultToleranceRequired
  );
  
  if (suitable.length === 0) return null;
  
  // Prefer recommended schemes
  const recommended = suitable.filter(option => option.recommended);
  if (recommended.length > 0) {
    // Return the one with highest efficiency among recommended
    return recommended.reduce((best, current) => 
      current.storage_efficiency > best.storage_efficiency ? current : best
    );
  }
  
  // If no recommended schemes fit, return the one with best efficiency
  return suitable.reduce((best, current) => 
    current.storage_efficiency > best.storage_efficiency ? current : best
  );
}

/**
 * Calculate storage efficiency for a given erasure coding configuration
 * Following MinIO's formula: Efficiency = Data Shards / (Data Shards + Parity Shards)
 */
export function calculateStorageEfficiency(dataShards: number, parityShards: number): number {
  return dataShards / (dataShards + parityShards);
}

/**
 * Calculate stripe size following MinIO logic
 */
export function calculateStripeSize(
  dataShards: number,
  preferredStripeMiB: number = 64
): number {
  return dataShards * preferredStripeMiB; // in MiB
}

/**
 * Calculate multipart part size following MinIO logic
 */
export function calculateMultipartPartSize(
  stripeSize: number,
  minPartSizeMiB: number = 512
): number {
  // Rule 5: Start at 512 MiB (S3's worst-case floor)
  let partSize = Math.max(minPartSizeMiB, stripeSize);
  
  // Round UP until it's an integer multiple of stripeSize
  if (partSize % stripeSize !== 0) {
    partSize = Math.ceil(partSize / stripeSize) * stripeSize;
  }
  
  // Bump to next "nice" power-of-two if reasonable (1 GiB, 2 GiB, 4 GiB...)
  const powerOfTwoOptions = [1024, 2048, 4096, 8192]; // 1GB, 2GB, 4GB, 8GB in MiB
  for (const powerOfTwo of powerOfTwoOptions) {
    if (powerOfTwo >= partSize && powerOfTwo <= partSize * 2) {
      partSize = powerOfTwo;
      break;
    }
  }
  
  return partSize; // in MiB
}

/**
 * Calculate minimum drives required for an erasure coding scheme
 * Following MinIO's requirements
 */
export function calculateMinDrives(dataShards: number, parityShards: number): number {
  return dataShards + parityShards;
}

/**
 * Get detailed erasure coding information using MinIO's rules
 */
export function getDetailedECInfo(
  totalDrives: number,
  userOverrideParity?: number
): {
  sets: { drives: number; dataShards: number; parityShards: number; efficiency: number }[];
  overallEfficiency: number;
  stripeSize: number;
  multipartPartSize: number;
  unusedDrives: number;
  totalUsableDrives: number;
} {
  const { sets, totalUsableDrives, overallEfficiency, unusedDrives } = calculateErasureSets(totalDrives, userOverrideParity);
  
  // Calculate stripe size based on first set (or average if mixed)
  const avgDataShards = sets.length > 0 ? 
    sets.reduce((sum, set) => sum + set.dataShards, 0) / sets.length : 8;
  const stripeSize = calculateStripeSize(Math.round(avgDataShards));
  const multipartPartSize = calculateMultipartPartSize(stripeSize);
  
  return {
    sets,
    overallEfficiency,
    stripeSize,
    multipartPartSize,
    unusedDrives,
    totalUsableDrives
  };
}

/**
 * Calculate MinIO erasure sets following official logic
 * Rules:
 * 1. Total drives = nodes × drivesPerNode
 * 2. Split drives into erasure sets, each ≤16 drives
 * 3. Use as many 16-drive sets as possible
 * 4. Any remainder (<16) becomes the final set
 */
export function calculateErasureSets(
  totalDrives: number,
  userOverrideParity?: number
): {
  sets: { drives: number; dataShards: number; parityShards: number; efficiency: number }[];
  totalUsableDrives: number;
  overallEfficiency: number;
  unusedDrives: number;
} {
  const sets: { drives: number; dataShards: number; parityShards: number; efficiency: number }[] = [];
  let remainingDrives = totalDrives;
  
  // Step 1: Create as many 16-drive sets as possible
  while (remainingDrives >= 16) {
    const setSize = 16;
    const parityShards = userOverrideParity || getRecommendedParity(setSize);
    const dataShards = setSize - parityShards;
    const efficiency = dataShards / setSize;
    
    sets.push({
      drives: setSize,
      dataShards,
      parityShards,
      efficiency
    });
    
    remainingDrives -= setSize;
  }
  
  // Step 2: Handle remainder - becomes the final set (if ≥4 drives)
  if (remainingDrives >= 4) {
    const setSize = remainingDrives;
    const parityShards = userOverrideParity || getRecommendedParity(setSize);
    
    // Ensure we don't have more parity than data
    const adjustedParityShards = Math.min(parityShards, Math.floor(setSize / 2));
    const dataShards = setSize - adjustedParityShards;
    const efficiency = dataShards / setSize;
    
    sets.push({
      drives: setSize,
      dataShards,
      parityShards: adjustedParityShards,
      efficiency
    });
    
    remainingDrives = 0; // All drives used
  }
  
  const totalUsableDrives = sets.reduce((sum, set) => sum + set.drives, 0);
  const totalDataShards = sets.reduce((sum, set) => sum + set.dataShards, 0);
  const totalShards = sets.reduce((sum, set) => sum + set.drives, 0);
  
  const overallEfficiency = totalShards > 0 ? totalDataShards / totalShards : 0;
  
  return {
    sets,
    totalUsableDrives,
    overallEfficiency,
    unusedDrives: remainingDrives // Only unused if < 4 drives remain
  };
}

/**
 * Get recommended parity based on drive count following MinIO logic
 */
export function getRecommendedParity(driveCount: number): number {
  if (driveCount >= 4 && driveCount <= 8) {
    return 2; // 2 parity shards for 4-8 drives
  } else if (driveCount >= 10 && driveCount <= 16) {
    return 4; // 4 parity shards for 10-16 drives
  } else if (driveCount >= 17) {
    return 4; // Default to 4 for larger sets
  }
  return 2; // Default fallback
}

/**
 * Validate drive count using MinIO's actual logic
 */
export function validateDriveCount(
  driveCount: number,
  _ecScheme?: ErasureCodeOption,
  userOverrideParity?: number
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Minimum 4 drives needed for any erasure coding
  if (driveCount < 4) {
    errors.push(`Minimum 4 drives required for erasure coding (have ${driveCount})`);
    return { valid: false, warnings, errors };
  }
  
  // Calculate erasure sets using MinIO logic
  const { sets, totalUsableDrives, overallEfficiency, unusedDrives } = calculateErasureSets(driveCount, userOverrideParity);
  
  if (sets.length === 0) {
    errors.push(`Cannot create valid erasure sets with ${driveCount} drives`);
    return { valid: false, warnings, errors };
  }
  
  // Warn about unused drives (only if < 4 remaining)
  if (unusedDrives > 0) {
    warnings.push(
      `${unusedDrives} drive(s) will be unused (need at least 4 drives for an erasure set). ` +
      `MinIO will create ${sets.length} erasure set(s) using ${totalUsableDrives} drives.`
    );
  }
  
  // Check efficiency
  if (overallEfficiency < 0.5) {
    warnings.push(
      `Low storage efficiency (${Math.round(overallEfficiency * 100)}%). Consider adjusting parity settings.`
    );
  }
  
  // Check for mixed set sizes (could indicate suboptimal configuration)
  const setSizes = sets.map(s => s.drives);
  const uniqueSizes = [...new Set(setSizes)];
  if (uniqueSizes.length > 1) {
    warnings.push(
      `Mixed erasure set sizes detected: ${uniqueSizes.join(', ')} drives. ` +
      `This is normal but may result in varying performance across sets.`
    );
  }
  
  // Check very large configurations
  if (driveCount > 1000) {
    warnings.push(
      `Very large configuration (${driveCount} drives). Consider using multiple server pools for better management.`
    );
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Get recommended default erasure coding scheme name
 */
export function getDefaultSchemeName(): string {
  return 'EC8:3'; // Always default to recommended EC8:3
}

/**
 * Get the scheme name from MinIO's auto-recommendation logic
 * @param totalDrives - Total drives available
 * @param faultTolerance - Required fault tolerance (default: 3)
 */
export function getAutoRecommendedSchemeName(
  totalDrives: number, 
  faultTolerance: number = 3
): string {
  const recommended = getRecommendedScheme(totalDrives, faultTolerance);
  return recommended?.scheme_name || getDefaultSchemeName();
}