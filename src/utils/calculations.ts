/**
 * MinIO Hardware Calculator - Calculation Utilities
 * Handles capacity calculations, performance estimates, and configuration optimization
 * Integrated with MinIO Field Architect Best Practices
 */

import { 
  validateConfiguration as validateFieldArchitectRules, 
  ValidationResult, 
  FIELD_ARCHITECT_RULES,
  getRecommendedNICSpeed 
} from '../config/field-architect-best-practices';

export interface ErasureCodingScheme {
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
    // Legacy support
    data_blocks?: number;
    parity_blocks?: number;
    total_blocks?: number;
    efficiency?: number;
  }
  
  export interface StorageDrive {
    vendor: string;
    model: string;
    capacity_tb: number;
    seq_read_mbps: number;
    seq_write_mbps: number;
    random_read_iops: number;
    random_write_iops: number;
    power_active_w: number;
    power_idle_w: number;
    form_factor: string;
    preferred: number;
  }
  
  export interface ChassisSpec {
    model: string;
    form_factor: string;
    drive_bays: number;
    drive_types: string;
    size_category: string;
    psu: string;
    depth: string;
    preferred: number;
  }
  
  export interface PerformanceMetrics {
    aggregateBandwidthGBps: number;
    totalIOPS: number;
    powerConsumptionW: number;
    powerConsumptionKWhPerMonth: number;
    thermalBTUPerHour: number;
  }
  
  export interface ConfigurationResult {
    servers: number;
    chassisModel: string;
    drivesPerServer: number;
    totalDrives: number;
    rawCapacityTB: number;
    usableCapacityTB: number;
    efficiency: number;
    rackUnits: number;
    performance: PerformanceMetrics;
    costAnalysis?: CostAnalysis;
  }
  
  export interface CostAnalysis {
    purchasePrice: number;
    annualDepreciation: number;
    monthlyDepreciation: number;
    monthlyPowerCost: number;
    pricePerTBUsable: number;
    pricePerTBRaw: number;
    fiveYearTCO: number;
  }
  
  /**
   * Convert capacity between different units
   */
  export function convertCapacity(value: number, fromUnit: string, toUnit: string): number {
    const units: { [key: string]: number } = {
      'GB': 1,
      'TB': 1000,
      'PB': 1000000,
      'EB': 1000000000
    };
  
    const fromMultiplier = units[fromUnit] || 1;
    const toMultiplier = units[toUnit] || 1;
  
    return (value * fromMultiplier) / toMultiplier;
  }

  /**
   * Format capacity with appropriate unit (TB or PB) for better readability
   */
  export function formatCapacity(capacityTB: number): string {
    if (capacityTB >= 1000) {
      const capacityPB = capacityTB / 1000;
      return `${capacityPB.toFixed(2)} PB`;
    }
    return `${capacityTB.toFixed(2)} TB`;
  }

  /**
   * Format bandwidth with appropriate unit (GB/s to TB/s) for better readability
   */
  export function formatBandwidth(bandwidthGBps: number): string {
    if (bandwidthGBps >= 1000) {
      const bandwidthTBps = bandwidthGBps / 1000;
      return `${bandwidthTBps.toFixed(2)} TB/s`;
    }
    return `${bandwidthGBps.toFixed(1)} GB/s`;
  }
  
  /**
   * Calculate raw capacity needed based on usable capacity and erasure coding
   * Uses standard efficiency calculation: Raw = Usable / Efficiency
   */
  export function calculateRawCapacity(usableCapacityTB: number, ecScheme: ErasureCodingScheme): number {
    // Use new storage_efficiency if available, fallback to legacy efficiency
    const efficiency = ecScheme.storage_efficiency || ecScheme.efficiency || 0.625;
    return usableCapacityTB / efficiency;
  }
  
  /**
   * Calculate the optimal number of servers based on capacity requirements
   * Now includes Field Architect best practices enforcement
   */
  /**
   * Calculate the optimal number of servers based on capacity requirements
   * Following MinIO's erasure coding distribution logic
   */
  export function calculateServerCount(
    rawCapacityTB: number,
    driveCapacityTB: number,
    driveBaysPerServer: number,
    ecScheme: ErasureCodingScheme
  ): number {
    const capacityPerServer = driveCapacityTB * driveBaysPerServer;
    const serversNeeded = Math.ceil(rawCapacityTB / capacityPerServer);
    
    // Ensure we have enough drives for the erasure coding scheme
    const minDrives = ecScheme.min_drives || ecScheme.total_shards || ecScheme.total_blocks || 11;
    const minServersForEC = Math.ceil(minDrives / driveBaysPerServer);
    
    // Apply Field Architect minimum server count rule
    const minServersFieldArchitect = FIELD_ARCHITECT_RULES.servers.minimumCount;
    
    // MinIO works best when drive count per server is aligned with erasure set size
    const ecSetSize = ecScheme.total_shards || ecScheme.total_blocks || 11;
    const optimalDrivesPerServer = Math.ceil(driveBaysPerServer / ecSetSize) * ecSetSize;
    const adjustedServersForAlignment = Math.ceil(rawCapacityTB / (driveCapacityTB * optimalDrivesPerServer));
    
    return Math.max(serversNeeded, minServersForEC, minServersFieldArchitect, adjustedServersForAlignment);
  }
  
  /**
   * Calculate performance metrics for the configuration
   */
  export function calculatePerformance(
    servers: number,
    drivesPerServer: number,
    drive: StorageDrive,
    serverOverheadW: number = 500
  ): PerformanceMetrics {
    const totalDrives = servers * drivesPerServer;
    
    // Bandwidth calculations (convert MB/s to GB/s)
    const aggregateBandwidthGBps = (totalDrives * drive.seq_read_mbps) / 1000;
    
    // IOPS calculations
    const totalIOPS = totalDrives * drive.random_read_iops;
    
    // Power calculations
    const drivePowerW = totalDrives * drive.power_active_w;
    const serverOverheadTotalW = servers * serverOverheadW;
    const powerConsumptionW = drivePowerW + serverOverheadTotalW;
    
    // Monthly power consumption in kWh
    const powerConsumptionKWhPerMonth = (powerConsumptionW * 24 * 30) / 1000;
    
    // Thermal output (1W = 3.412 BTU/hr)
    const thermalBTUPerHour = powerConsumptionW * 3.412;
  
    return {
      aggregateBandwidthGBps,
      totalIOPS,
      powerConsumptionW,
      powerConsumptionKWhPerMonth,
      thermalBTUPerHour
    };
  }
  
  /**
   * Calculate cost analysis including TCO
   */
  export function calculateCostAnalysis(
    purchasePrice: number,
    usableCapacityTB: number,
    rawCapacityTB: number,
    monthlyPowerKWh: number,
    electricityRatePerKWh: number = 0.12
  ): CostAnalysis {
    const annualDepreciation = purchasePrice / 5; // 5-year depreciation
    const monthlyDepreciation = annualDepreciation / 12;
    const monthlyPowerCost = monthlyPowerKWh * electricityRatePerKWh;
    
    const pricePerTBUsable = purchasePrice / usableCapacityTB;
    const pricePerTBRaw = purchasePrice / rawCapacityTB;
    
    // 5-year TCO includes purchase price and 5 years of power costs
    const fiveYearPowerCost = monthlyPowerCost * 12 * 5;
    const fiveYearTCO = purchasePrice + fiveYearPowerCost;
  
    return {
      purchasePrice,
      annualDepreciation,
      monthlyDepreciation,
      monthlyPowerCost,
      pricePerTBUsable,
      pricePerTBRaw,
      fiveYearTCO
    };
  }
  
  /**
   * Find the best chassis for given requirements
   */
  export function findOptimalChassis(
    chassisOptions: ChassisSpec[],
    sizeCategory: string,
    minDriveBays?: number
  ): ChassisSpec | null {
    const filtered = chassisOptions.filter(chassis => {
      const matchesSize = chassis.size_category === sizeCategory;
      const matchesDriveBays = !minDriveBays || chassis.drive_bays >= minDriveBays;
      return matchesSize && matchesDriveBays;
    });
  
    if (filtered.length === 0) return null;
  
    // Sort by preference (lower number = higher preference) and then by drive bays
    return filtered.sort((a, b) => {
      if (a.preferred !== b.preferred) {
        return (a.preferred || 999) - (b.preferred || 999);
      }
      return b.drive_bays - a.drive_bays; // More drive bays is better
    })[0];
  }
  
  /**
   * Find the best storage drive for given requirements
   */
  export function findOptimalDrive(
    driveOptions: StorageDrive[],
    targetCapacityTB?: number,
    formFactor?: string
  ): StorageDrive | null {
    let filtered = driveOptions;
  
    if (targetCapacityTB) {
      filtered = filtered.filter(drive => drive.capacity_tb === targetCapacityTB);
    }
  
    if (formFactor) {
      filtered = filtered.filter(drive => drive.form_factor.includes(formFactor));
    }
  
    if (filtered.length === 0) return null;
  
    // Sort by preference (lower number = higher preference)
    return filtered.sort((a, b) => (a.preferred || 999) - (b.preferred || 999))[0];
  }
  
  /**
   * Generate a complete configuration recommendation
   */
  export function generateConfiguration(
    usableCapacityTB: number,
    ecScheme: ErasureCodingScheme,
    chassis: ChassisSpec,
    drive: StorageDrive,
    purchasePrice?: number
  ): ConfigurationResult {
    const rawCapacityTB = calculateRawCapacity(usableCapacityTB, ecScheme);
    const servers = calculateServerCount(rawCapacityTB, drive.capacity_tb, chassis.drive_bays, ecScheme);
    
    const drivesPerServer = chassis.drive_bays;
    const totalDrives = servers * drivesPerServer;
    const actualRawCapacityTB = totalDrives * drive.capacity_tb;
    const efficiency = ecScheme.storage_efficiency || ecScheme.efficiency || 0.625;
    const actualUsableCapacityTB = actualRawCapacityTB * efficiency;
    
    const rackUnits = servers * (chassis.form_factor === '1U' ? 1 : 2);
    const performance = calculatePerformance(servers, drivesPerServer, drive);
    
    let costAnalysis: CostAnalysis | undefined;
    if (purchasePrice && purchasePrice > 0) {
      costAnalysis = calculateCostAnalysis(
        purchasePrice,
        actualUsableCapacityTB,
        actualRawCapacityTB,
        performance.powerConsumptionKWhPerMonth
      );
    }
  
    return {
      servers,
      chassisModel: chassis.model,
      drivesPerServer,
      totalDrives,
      rawCapacityTB: actualRawCapacityTB,
      usableCapacityTB: actualUsableCapacityTB,
      efficiency: efficiency,
      rackUnits,
      performance,
      costAnalysis
    };
  }
  
  /**
   * Generate configuration with Field Architect best practices validation
   */
  export function generateConfigurationWithValidation(
    usableCapacityTB: number,
    ecScheme: ErasureCodingScheme,
    chassis: ChassisSpec,
    drive: StorageDrive,
    cpuCores?: number,
    memoryGB?: number,
    purchasePrice?: number
  ): ConfigurationResult & { 
    fieldArchitectValidation: ValidationResult[];
    recommendations: string[];
    isFieldArchitectCompliant: boolean;
  } {
    // Generate base configuration
    const baseConfig = generateConfiguration(usableCapacityTB, ecScheme, chassis, drive, purchasePrice);
    
    // Get recommended NIC speed for this capacity
    const recommendedNICSpeed = getRecommendedNICSpeed(usableCapacityTB);
    
    // Validate against Field Architect rules
    const validation = validateFieldArchitectRules({
      usableCapacityTB: baseConfig.usableCapacityTB,
      servers: baseConfig.servers,
      drivesPerServer: baseConfig.drivesPerServer,
      cpuCores,
      memoryGB,
      nicSpeedGbps: recommendedNICSpeed // Use recommended speed for validation
    });
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    // Server count recommendations
    if (baseConfig.servers < FIELD_ARCHITECT_RULES.servers.recommendedCount) {
      recommendations.push(
        `Consider using ${FIELD_ARCHITECT_RULES.servers.recommendedCount}+ servers for optimal performance (currently: ${baseConfig.servers})`
      );
    }
    
    // Drive count recommendations
    if (baseConfig.drivesPerServer < FIELD_ARCHITECT_RULES.drives.recommendedPerHost) {
      recommendations.push(
        `Consider using ${FIELD_ARCHITECT_RULES.drives.recommendedPerHost}+ drives per server for better performance (currently: ${baseConfig.drivesPerServer})`
      );
    }
    
    // Capacity recommendations
    if (baseConfig.usableCapacityTB < FIELD_ARCHITECT_RULES.capacity.minimumUsableCapacityTB) {
      recommendations.push(
        `Consider increasing usable capacity to at least ${FIELD_ARCHITECT_RULES.capacity.minimumUsableCapacityTB}TB for production use`
      );
    }
    
    // Networking recommendations
    recommendations.push(
      `Recommended NIC speed for ${baseConfig.usableCapacityTB.toFixed(1)}TB: ${recommendedNICSpeed}Gbps`
    );
    
    // CPU and Memory recommendations
    if (cpuCores && cpuCores < FIELD_ARCHITECT_RULES.cpu.minimumCores) {
      recommendations.push(
        `CPU cores should be at least ${FIELD_ARCHITECT_RULES.cpu.minimumCores} (currently: ${cpuCores})`
      );
    }
    
    if (memoryGB && memoryGB < FIELD_ARCHITECT_RULES.memory.minimumGB) {
      recommendations.push(
        `Memory should be at least ${FIELD_ARCHITECT_RULES.memory.minimumGB}GB (currently: ${memoryGB})`
      );
    }
    
    // Check compliance (no errors)
    const isFieldArchitectCompliant = !validation.some(v => v.level === 'error');
    
    return {
      ...baseConfig,
      fieldArchitectValidation: validation,
      recommendations,
      isFieldArchitectCompliant
    };
  }
  
  /**
   * Validate configuration against constraints
   */
  export function validateConfiguration(
    servers: number,
    drivesPerServer: number,
    ecScheme: ErasureCodingScheme
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    const totalDrives = servers * drivesPerServer;
    const minDrives = ecScheme.min_drives || ecScheme.total_shards || ecScheme.total_blocks || 11;
    const ecSetSize = ecScheme.total_shards || ecScheme.total_blocks || 11;
    const dataShards = ecScheme.data_shards || ecScheme.data_blocks || 8;
    const parityShards = ecScheme.parity_shards || ecScheme.parity_blocks || 3;
    
    // Check if we have enough drives for erasure coding
    if (totalDrives < minDrives) {
      errors.push(`Minimum ${minDrives} drives required for ${dataShards}:${parityShards} erasure coding`);
    }
    
    // Check if drive count per server is optimal for EC
    if (drivesPerServer % ecSetSize !== 0) {
      warnings.push(`Drive count per server (${drivesPerServer}) is not a multiple of EC set size (${ecSetSize}). This may result in suboptimal storage utilization.`);
    }
    
    // Check MinIO quorum requirements
    const writeQuorum = parityShards >= (ecSetSize / 2) ? dataShards + 1 : dataShards;
    
    if (totalDrives < writeQuorum) {
      errors.push(`Write quorum requires at least ${writeQuorum} drives for reliable operation`);
    }
    
    // Check if server count allows for proper EC distribution
    if (servers < 2 && totalDrives > ecSetSize) {
      warnings.push('Consider using multiple servers for better fault tolerance and performance distribution.');
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
  
  /**
   * Calculate rack space requirements including switches and management
   */
  export function calculateRackRequirements(
    servers: number,
    chassisFormFactor: string,
    includeNetworking: boolean = true,
    includeManagement: boolean = true
  ): {
    serverRackUnits: number;
    networkingRackUnits: number;
    managementRackUnits: number;
    totalRackUnits: number;
    recommendedRacks: number;
  } {
    const serverRackUnits = servers * (chassisFormFactor === '1U' ? 1 : 2);
    
    let networkingRackUnits = 0;
    if (includeNetworking) {
      // Estimate switch requirements (1U per 48 ports, assume 2 ports per server for redundancy)
      const portsNeeded = servers * 2;
      const switchesNeeded = Math.ceil(portsNeeded / 48);
      networkingRackUnits = switchesNeeded * 1;
    }
    
    let managementRackUnits = 0;
    if (includeManagement) {
      // PDUs, KVM, management server
      managementRackUnits = 3;
    }
    
    const totalRackUnits = serverRackUnits + networkingRackUnits + managementRackUnits;
    
    // Standard rack is 42U, leave 10% for cable management and future expansion
    const usableRackUnits = 42 * 0.9;
    const recommendedRacks = Math.ceil(totalRackUnits / usableRackUnits);
    
    return {
      serverRackUnits,
      networkingRackUnits,
      managementRackUnits,
      totalRackUnits,
      recommendedRacks
    };
  }