/**
 * MinIO Field Architect Best Practices Configuration
 * 
 * This file contains the official MinIO Field Architect recommendations
 * for hardware configurations and deployment best practices.
 * 
 * DEVELOPER NOTE: This is the single source of truth for all Field Architect
 * rules and recommendations. Update this file when MinIO best practices change.
 * 
 * Used by:
 * - src/utils/calculations.ts - For validation and configuration generation
 * - src/components/Form.tsx - For minimum server count enforcement
 * - src/components/FieldArchitectRecommendations.tsx - For displaying rules
 * 
 * Key Rules:
 * - Minimum 4 servers for high availability
 * - Minimum 400TB usable capacity
 * - Minimum 92 CPU cores per server
 * - Minimum 256GB RAM per server
 * - Minimum 4 drives per server
 */

export interface FieldArchitectRules {
  capacity: {
    minimumUsableCapacityTB: number;
    description: string;
  };
  servers: {
    minimumCount: number;
    recommendedCount: number;
    description: string;
  };
  drives: {
    minimumPerHost: number;
    recommendedPerHost: number;
    description: string;
  };
  cpu: {
    sockets: number;
    minimumCores: number;
    description: string;
  };
  memory: {
    minimumGB: number;
    description: string;
  };
  networking: {
    minimumSpeedGbps: number;
    recommendedSpeedUpTo1PB: number;
    recommendedSpeed1PBTo1EB: number;
    description: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation?: string;
}

export interface CapacityTier {
  name: string;
  minCapacityTB: number;
  maxCapacityTB: number;
  recommendedNICSpeedGbps: number;
  description: string;
}

/**
 * Official MinIO Field Architect Best Practices
 */
export const FIELD_ARCHITECT_RULES: FieldArchitectRules = {
  capacity: {
    minimumUsableCapacityTB: 400,
    description: "Minimum recommended usable capacity for production MinIO deployments"
  },
  servers: {
    minimumCount: 4,
    recommendedCount: 8,
    description: "Minimum 4 servers required for high availability, 8+ recommended for optimal performance and fault tolerance"
  },
  drives: {
    minimumPerHost: 4,
    recommendedPerHost: 8,
    description: "Minimum 4 dedicated locally-attached drives per host, 8+ recommended for better performance and capacity"
  },
  cpu: {
    sockets: 1,
    minimumCores: 92,
    description: "Single socket with minimum 92 CPU cores for optimal MinIO performance"
  },
  memory: {
    minimumGB: 256,
    description: "Minimum 256GB RAM for production workloads with adequate buffer cache"
  },
  networking: {
    minimumSpeedGbps: 25,
    recommendedSpeedUpTo1PB: 100,
    recommendedSpeed1PBTo1EB: 400,
    description: "Network speed recommendations based on storage capacity and expected throughput"
  }
};

/**
 * Capacity-based networking recommendations
 */
export const CAPACITY_TIERS: CapacityTier[] = [
  {
    name: "Small to Medium",
    minCapacityTB: 0,
    maxCapacityTB: 1000, // 1PB
    recommendedNICSpeedGbps: 100,
    description: "Up to 1PB usable storage"
  },
  {
    name: "Large Scale",
    minCapacityTB: 1000, // 1PB
    maxCapacityTB: 1000000, // 1EB
    recommendedNICSpeedGbps: 400,
    description: "1PB to 1EB usable storage"
  },
  {
    name: "Exascale",
    minCapacityTB: 1000000, // 1EB+
    maxCapacityTB: Infinity,
    recommendedNICSpeedGbps: 400,
    description: "1EB+ usable storage - contact MinIO for custom recommendations"
  }
];

/**
 * Get the appropriate capacity tier for a given usable capacity
 */
export function getCapacityTier(usableCapacityTB: number): CapacityTier {
  return CAPACITY_TIERS.find(tier => 
    usableCapacityTB >= tier.minCapacityTB && usableCapacityTB < tier.maxCapacityTB
  ) || CAPACITY_TIERS[CAPACITY_TIERS.length - 1];
}

/**
 * Get recommended NIC speed based on usable capacity
 */
export function getRecommendedNICSpeed(usableCapacityTB: number): number {
  if (usableCapacityTB <= 1000) { // Up to 1PB
    return FIELD_ARCHITECT_RULES.networking.recommendedSpeedUpTo1PB;
  } else { // 1PB to 1EB
    return FIELD_ARCHITECT_RULES.networking.recommendedSpeed1PBTo1EB;
  }
}

/**
 * Validate a configuration against Field Architect best practices
 */
export function validateConfiguration(config: {
  usableCapacityTB: number;
  servers: number;
  drivesPerServer: number;
  cpuCores?: number;
  memoryGB?: number;
  nicSpeedGbps?: number;
}): ValidationResult[] {
  const results: ValidationResult[] = [];
  const rules = FIELD_ARCHITECT_RULES;

  // Validate usable capacity
  if (config.usableCapacityTB < rules.capacity.minimumUsableCapacityTB) {
    results.push({
      isValid: false,
      level: 'warning',
      category: 'Capacity',
      message: `Usable capacity (${config.usableCapacityTB}TB) is below recommended minimum (${rules.capacity.minimumUsableCapacityTB}TB)`,
      recommendation: `Consider increasing to at least ${rules.capacity.minimumUsableCapacityTB}TB for production use`
    });
  }

  // Validate server count
  if (config.servers < rules.servers.minimumCount) {
    results.push({
      isValid: false,
      level: 'error',
      category: 'Servers',
      message: `Server count (${config.servers}) is below minimum requirement (${rules.servers.minimumCount})`,
      recommendation: `Use at least ${rules.servers.minimumCount} servers for high availability`
    });
  } else if (config.servers < rules.servers.recommendedCount) {
    results.push({
      isValid: true,
      level: 'warning',
      category: 'Servers',
      message: `Server count (${config.servers}) is below recommended (${rules.servers.recommendedCount}+)`,
      recommendation: `Consider using ${rules.servers.recommendedCount}+ servers for optimal performance and fault tolerance`
    });
  }

  // Validate drives per server
  if (config.drivesPerServer < rules.drives.minimumPerHost) {
    results.push({
      isValid: false,
      level: 'error',
      category: 'Storage',
      message: `Drives per server (${config.drivesPerServer}) is below minimum (${rules.drives.minimumPerHost})`,
      recommendation: `Use at least ${rules.drives.minimumPerHost} dedicated locally-attached drives per host`
    });
  } else if (config.drivesPerServer < rules.drives.recommendedPerHost) {
    results.push({
      isValid: true,
      level: 'warning',
      category: 'Storage',
      message: `Drives per server (${config.drivesPerServer}) is below recommended (${rules.drives.recommendedPerHost}+)`,
      recommendation: `Consider using ${rules.drives.recommendedPerHost}+ drives per server for better performance`
    });
  }

  // Validate CPU cores if provided
  if (config.cpuCores !== undefined) {
    if (config.cpuCores < rules.cpu.minimumCores) {
      results.push({
        isValid: false,
        level: 'error',
        category: 'CPU',
        message: `CPU cores (${config.cpuCores}) is below minimum (${rules.cpu.minimumCores})`,
        recommendation: `Use at least ${rules.cpu.minimumCores} CPU cores for optimal MinIO performance`
      });
    }
  }

  // Validate memory if provided
  if (config.memoryGB !== undefined) {
    if (config.memoryGB < rules.memory.minimumGB) {
      results.push({
        isValid: false,
        level: 'error',
        category: 'Memory',
        message: `Memory (${config.memoryGB}GB) is below minimum (${rules.memory.minimumGB}GB)`,
        recommendation: `Use at least ${rules.memory.minimumGB}GB RAM for production workloads`
      });
    }
  }

  // Validate networking if provided
  if (config.nicSpeedGbps !== undefined) {
    const recommendedSpeed = getRecommendedNICSpeed(config.usableCapacityTB);
    const capacityTier = getCapacityTier(config.usableCapacityTB);
    
    if (config.nicSpeedGbps < rules.networking.minimumSpeedGbps) {
      results.push({
        isValid: false,
        level: 'error',
        category: 'Networking',
        message: `NIC speed (${config.nicSpeedGbps}Gbps) is below minimum (${rules.networking.minimumSpeedGbps}Gbps)`,
        recommendation: `Use at least ${rules.networking.minimumSpeedGbps}Gbps network interfaces`
      });
    } else if (config.nicSpeedGbps < recommendedSpeed) {
      results.push({
        isValid: true,
        level: 'warning',
        category: 'Networking',
        message: `NIC speed (${config.nicSpeedGbps}Gbps) is below recommended (${recommendedSpeed}Gbps) for ${capacityTier.description}`,
        recommendation: `Consider upgrading to ${recommendedSpeed}Gbps network interfaces for optimal throughput`
      });
    }
  }

  return results;
}

/**
 * Get all Field Architect recommendations for display
 */
export function getBestPracticesSummary(): Record<string, any> {
  return {
    capacity: {
      title: "Capacity Requirements",
      minimum: `${FIELD_ARCHITECT_RULES.capacity.minimumUsableCapacityTB}TB usable`,
      description: FIELD_ARCHITECT_RULES.capacity.description
    },
    servers: {
      title: "Server Configuration",
      minimum: `${FIELD_ARCHITECT_RULES.servers.minimumCount} servers`,
      recommended: `${FIELD_ARCHITECT_RULES.servers.recommendedCount}+ servers`,
      description: FIELD_ARCHITECT_RULES.servers.description
    },
    drives: {
      title: "Storage Drives",
      minimum: `${FIELD_ARCHITECT_RULES.drives.minimumPerHost} drives per host`,
      recommended: `${FIELD_ARCHITECT_RULES.drives.recommendedPerHost}+ drives per host`,
      description: FIELD_ARCHITECT_RULES.drives.description
    },
    cpu: {
      title: "CPU Requirements",
      sockets: `${FIELD_ARCHITECT_RULES.cpu.sockets} socket`,
      minimum: `${FIELD_ARCHITECT_RULES.cpu.minimumCores} cores`,
      description: FIELD_ARCHITECT_RULES.cpu.description
    },
    memory: {
      title: "Memory Requirements",
      minimum: `${FIELD_ARCHITECT_RULES.memory.minimumGB}GB RAM`,
      description: FIELD_ARCHITECT_RULES.memory.description
    },
    networking: {
      title: "Network Requirements",
      minimum: `${FIELD_ARCHITECT_RULES.networking.minimumSpeedGbps}Gbps`,
      upTo1PB: `${FIELD_ARCHITECT_RULES.networking.recommendedSpeedUpTo1PB}Gbps (up to 1PB)`,
      over1PB: `${FIELD_ARCHITECT_RULES.networking.recommendedSpeed1PBTo1EB}Gbps (1PB-1EB)`,
      description: FIELD_ARCHITECT_RULES.networking.description
    }
  };
}

export default FIELD_ARCHITECT_RULES;