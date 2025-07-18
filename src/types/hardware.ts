export interface Chassis {
  vendor: string;
  model: string;
  formFactor: string;
  driveBays: number;
  driveTypes: string[];
  cpuSockets: number;
  memorySlots: number;
  sizeCategory: 'small' | 'medium' | 'large';
  powerSupply: {
    watts: number;
    redundant: boolean;
  };
  rackUnits: number;
  maxPowerConsumption: number;
}

export interface StorageDrive {
  vendor: string;
  model: string;
  capacity: number; // TB
  interface: string;
  formFactor: string;
  performance: {
    sequentialReadMBps: number;
    sequentialWriteMBps: number;
    randomReadIOPS: number;
    randomWriteIOPS: number;
  };
  powerConsumption: {
    activeW: number;
    idleW: number;
  };
  price?: number;
}

export interface CPU {
  vendor: string;
  model: string;
  cores: number;
  threads: number;
  baseClockGHz: number;
  boostClockGHz: number;
  tdp: number;
  memoryChannels: number;
  maxMemoryGBps: number;
  pcieLanes: number;
  price?: number;
}

export interface Memory {
  vendor: string;
  model: string;
  capacity: number; // GB
  type: string; // DDR4, DDR5
  speed: number; // MHz
  price?: number;
}

export interface BootDrive {
  vendor: string;
  model: string;
  capacity: number; // GB
  interface: string;
  price?: number;
}

export interface HardwareSpecs {
  chassis: Chassis[];
  storageDrives: StorageDrive[];
  cpus: CPU[];
  memory: Memory[];
  bootDrives: BootDrive[];
}

export interface ErasureCodingScheme {
  dataShards: number;
  parityShards: number;
  efficiency: number;
  faultTolerance: number;
  name: string;
}

export interface PerformanceMetrics {
  aggregateBandwidthGBps: number;
  totalIOPS: number;
  powerConsumptionW: number;
  powerConsumptionKWhPerMonth: number;
  thermalBTUPerHour: number;
}

export interface CostAnalysis {
  serverCost: number;
  driveCost: number;
  totalHardwareCost: number;
  annualDepreciation: number;
  monthlyPowerCost: number;
  fiveYearTCO: number;
  costPerTBUsable: number;
}

export interface ConfigurationInput {
  usableCapacityTB: number;
  selectedChassis?: string;
  selectedDrive?: string;
  erasureCodingScheme: ErasureCodingScheme;
  electricityRatePerKWh?: number;
  depreciationYears?: number;
}

export interface ConfigurationResult {
  servers: number;
  chassisModel: string;
  chassisSpecs: Chassis;
  driveModel: string;
  driveSpecs: StorageDrive;
  drivesPerServer: number;
  totalDrives: number;
  rawCapacityTB: number;
  usableCapacityTB: number;
  efficiency: number;
  rackUnits: number;
  performance: PerformanceMetrics;
  costAnalysis?: CostAnalysis;
  warnings: string[];
}

export interface RackConfiguration {
  serversPerRack: number;
  totalRacks: number;
  rackUtilization: number;
  racksLayout: {
    rackId: number;
    servers: number;
    remainingU: number;
  }[];
}

export const ERASURE_CODING_SCHEMES: ErasureCodingScheme[] = [
  {
    dataShards: 8,
    parityShards: 2,
    efficiency: 0.8,
    faultTolerance: 2,
    name: 'EC 8:2'
  },
  {
    dataShards: 8,
    parityShards: 3,
    efficiency: 0.727,
    faultTolerance: 3,
    name: 'EC 8:3'
  },
  {
    dataShards: 8,
    parityShards: 4,
    efficiency: 0.667,
    faultTolerance: 4,
    name: 'EC 8:4'
  }
];

export const DEFAULT_ELECTRICITY_RATE = 0.12; // USD per kWh
export const DEFAULT_DEPRECIATION_YEARS = 5;