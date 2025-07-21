/**
 * MinIO Hardware Calculator - Data Loader Utilities
 * Handles loading and caching of hardware specifications data
 */

export interface HardwareSpecs {
    metadata: {
      version: string;
      generated: string;
      description: string;
    };
    vendors: {
      [key: string]: VendorSpec;
    };
    storage_drives: StorageDriveSpec[];
    cpus: CPUSpec[];
    memory: MemorySpec[];
    boot_drives: BootDriveSpec[];
    erasure_coding: ErasureCodingConfig;
    size_categories: {
      [key: string]: SizeCategorySpec;
    };
  }
  
  export interface VendorSpec {
    name: string;
    chassis: {
      [key: string]: ChassisSpec;
    };
    supported_sizes: string[];
  }
  
  export interface ChassisSpec {
    model: string;
    form_factor: string;
    drive_bays: number;
    drive_types: string;
    cpu_sockets: string;
    memory_slots: string;
    memory_max: string;
    size_category: string;
    psu: string;
    depth: string;
    vendor_link: string;
    notes: string;
    preferred: number;
  }
  
  export interface StorageDriveSpec {
    vendor: string;
    model: string;
    part_number: string;
    nvme_gen: string;
    form_factor: string;
    interface: string;
    technology: string;
    capacity_tb: number;
    capacity_raw: string;
    seq_read_mbps: number;
    seq_write_mbps: number;
    random_read_iops: number;
    random_write_iops: number;
    power_active_w: number;
    power_idle_w: number;
    power_raw: string;
    tech_spec_url: string;
    preferred: number;
  }
  
  export interface CPUSpec {
    vendor: string;
    model: string;
    line: string;
    cores: number;
    threads: number;
    boost_clock: string;
    base_clock: string;
    l3_cache: string;
    tdp: string;
    memory_type: string;
    memory_channels: number;
    max_memory_freq: number;
    memory_bandwidth: number;
    pcie_lanes: number;
    socket_support: string;
    generation: string;
    year: number;
    codename: string;
    architecture: string;
    socket: string;
    preferred: number;
  }
  
  export interface MemorySpec {
    vendor: string;
    model: string;
    description: string;
    size_gb: number;
    size_raw: string;
    speed: string;
    profile: string;
    preferred: number;
  }
  
  export interface BootDriveSpec {
    vendor: string;
    model: string;
    part_number: string;
    form_factor: string;
    capacity: string;
    interface: string;
    preferred: number;
  }
  
  export interface ErasureCodingConfig {
    default_scheme: string;
    schemes: {
      [key: string]: {
        data_blocks: number;
        parity_blocks: number;
        total_blocks: number;
        efficiency: number;
        min_drives: number;
        fault_tolerance: number;
      };
    };
  }

  /**
   * Get recommended default erasure coding scheme (should be recommended)
   */
  export function getDefaultErasureCodingScheme(): string {
    return 'EC8:3'; // Default to recommended EC8:3
  }
  
  export interface SizeCategorySpec {
    description: string;
    typical_form_factor: string;
    drive_bay_range: number[];
  }
  
  export interface FilterOptions {
    vendor?: string;
    size_category?: string;
    min_capacity?: number;
    max_capacity?: number;
    form_factor?: string;
    preferred_only?: boolean;
  }
  
  class DataLoader {
    private hardwareSpecs: HardwareSpecs | null = null;
    private loading: boolean = false;
    private error: string | null = null;
  
    /**
     * Load hardware specifications from JSON file
     */
    async loadHardwareSpecs(forceReload: boolean = false): Promise<HardwareSpecs> {
      if (this.hardwareSpecs && !forceReload) {
        return this.hardwareSpecs;
      }
  
      if (this.loading) {
        // Wait for ongoing load to complete
        while (this.loading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (this.hardwareSpecs) {
          return this.hardwareSpecs;
        }
      }
  
      this.loading = true;
      this.error = null;
  
      try {
        const response = await fetch('/data/hardware_specs.json');
        if (!response.ok) {
          throw new Error(`Failed to load hardware specs: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        this.validateHardwareSpecs(data);
        this.hardwareSpecs = data as HardwareSpecs;
        
        console.log('✅ Hardware specifications loaded successfully');
        return this.hardwareSpecs;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error loading hardware specs';
        console.error('❌ Error loading hardware specs:', this.error);
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    }
  
    /**
     * Validate the structure of loaded hardware specs
     */
    private validateHardwareSpecs(data: any): void {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid hardware specs format');
      }
  
      const requiredFields = ['metadata', 'vendors', 'storage_drives', 'cpus', 'memory', 'erasure_coding'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
  
      if (!data.metadata?.version) {
        throw new Error('Missing metadata version');
      }
  
      console.log(`📋 Loaded hardware specs version ${data.metadata.version}`);
    }
  
    /**
     * Get available vendors
     */
    getVendors(): string[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
      return Object.keys(this.hardwareSpecs.vendors);
    }
  
    /**
     * Get chassis options for a vendor and size category
     */
    getChassis(vendor?: string, sizeCategory?: string): ChassisSpec[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      let chassis: ChassisSpec[] = [];
  
      if (vendor && this.hardwareSpecs.vendors[vendor]) {
        chassis = Object.values(this.hardwareSpecs.vendors[vendor].chassis);
      } else {
        // Get all chassis from all vendors
        for (const vendorData of Object.values(this.hardwareSpecs.vendors)) {
          chassis.push(...Object.values(vendorData.chassis));
        }
      }
  
      if (sizeCategory) {
        chassis = chassis.filter(c => c.size_category === sizeCategory);
      }
  
      return chassis.sort((a, b) => (a.preferred || 999) - (b.preferred || 999));
    }
  
    /**
     * Get storage drive options with filtering
     */
    getStorageDrives(filters: FilterOptions = {}): StorageDriveSpec[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      let drives = [...this.hardwareSpecs.storage_drives];
  
      if (filters.vendor) {
        drives = drives.filter(d => d.vendor.toLowerCase() === filters.vendor!.toLowerCase());
      }
  
      if (filters.min_capacity !== undefined) {
        drives = drives.filter(d => d.capacity_tb >= filters.min_capacity!);
      }
  
      if (filters.max_capacity !== undefined) {
        drives = drives.filter(d => d.capacity_tb <= filters.max_capacity!);
      }
  
      if (filters.form_factor) {
        drives = drives.filter(d => d.form_factor.includes(filters.form_factor!));
      }
  
      if (filters.preferred_only) {
        drives = drives.filter(d => d.preferred <= 2);
      }
  
      return drives.sort((a, b) => {
        // Sort by preference first, then by capacity
        if (a.preferred !== b.preferred) {
          return (a.preferred || 999) - (b.preferred || 999);
        }
        return b.capacity_tb - a.capacity_tb;
      });
    }
  
    /**
     * Get CPU options with filtering
     */
    getCPUs(filters: FilterOptions = {}): CPUSpec[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      let cpus = [...this.hardwareSpecs.cpus];
  
      if (filters.vendor) {
        cpus = cpus.filter(c => c.vendor.toLowerCase() === filters.vendor!.toLowerCase());
      }
  
      if (filters.preferred_only) {
        cpus = cpus.filter(c => c.preferred <= 2);
      }
  
      return cpus.sort((a, b) => {
        // Sort by preference first, then by core count
        if (a.preferred !== b.preferred) {
          return (a.preferred || 999) - (b.preferred || 999);
        }
        return b.cores - a.cores;
      });
    }
  
    /**
     * Get memory options with filtering
     */
    getMemory(filters: FilterOptions = {}): MemorySpec[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      let memory = [...this.hardwareSpecs.memory];
  
      if (filters.vendor) {
        memory = memory.filter(m => m.vendor.toLowerCase() === filters.vendor!.toLowerCase());
      }
  
      if (filters.preferred_only) {
        memory = memory.filter(m => m.preferred <= 2);
      }
  
      return memory.sort((a, b) => {
        // Sort by preference first, then by size
        if (a.preferred !== b.preferred) {
          return (a.preferred || 999) - (b.preferred || 999);
        }
        return b.size_gb - a.size_gb;
      });
    }
  
    /**
     * Get erasure coding schemes
     */
    getErasureCodingSchemes(): ErasureCodingConfig {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
      return this.hardwareSpecs.erasure_coding;
    }
  
    /**
     * Get size categories
     */
    getSizeCategories(): { [key: string]: SizeCategorySpec } {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
      return this.hardwareSpecs.size_categories;
    }
  
    /**
     * Get supported sizes for a vendor
     */
    getSupportedSizes(vendor: string): string[] {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      const vendorData = this.hardwareSpecs.vendors[vendor];
      return vendorData ? vendorData.supported_sizes : [];
    }
  
    /**
     * Find optimal drive for given capacity
     */
    findOptimalDrive(capacityTB: number, formFactor?: string): StorageDriveSpec | null {
      const drives = this.getStorageDrives({ 
        form_factor: formFactor,
        preferred_only: true 
      });
  
      // Find exact match first
      let exactMatch = drives.find(d => d.capacity_tb === capacityTB);
      if (exactMatch) return exactMatch;
  
      // Find closest capacity that's >= requested
      const suitableDrives = drives.filter(d => d.capacity_tb >= capacityTB);
      if (suitableDrives.length > 0) {
        return suitableDrives.reduce((closest, current) => 
          current.capacity_tb < closest.capacity_tb ? current : closest
        );
      }
  
      // If no suitable drive found, return the largest available
      return drives.length > 0 ? drives[0] : null;
    }
  
    /**
     * Search across all hardware components
     */
    search(query: string): {
      chassis: ChassisSpec[];
      drives: StorageDriveSpec[];
      cpus: CPUSpec[];
      memory: MemorySpec[];
    } {
      if (!this.hardwareSpecs) {
        throw new Error('Hardware specs not loaded');
      }
  
      const searchTerm = query.toLowerCase();
  
      const chassis = this.getChassis().filter(c => 
        c.model.toLowerCase().includes(searchTerm) ||
        c.notes?.toLowerCase().includes(searchTerm)
      );
  
      const drives = this.getStorageDrives().filter(d =>
        d.model.toLowerCase().includes(searchTerm) ||
        d.vendor.toLowerCase().includes(searchTerm) ||
        d.technology.toLowerCase().includes(searchTerm)
      );
  
      const cpus = this.getCPUs().filter(c =>
        c.model.toLowerCase().includes(searchTerm) ||
        c.line.toLowerCase().includes(searchTerm) ||
        c.architecture.toLowerCase().includes(searchTerm)
      );
  
      const memory = this.getMemory().filter(m =>
        m.model.toLowerCase().includes(searchTerm) ||
        m.description.toLowerCase().includes(searchTerm)
      );
  
      return { chassis, drives, cpus, memory };
    }
  
    /**
     * Get current error state
     */
    getError(): string | null {
      return this.error;
    }
  
    /**
     * Check if data is currently loading
     */
    isLoading(): boolean {
      return this.loading;
    }
  
    /**
     * Get metadata about the loaded specs
     */
    getMetadata(): HardwareSpecs['metadata'] | null {
      return this.hardwareSpecs?.metadata || null;
    }
  
    /**
     * Export current configuration as JSON
     */
    exportConfiguration(config: any): string {
      const exportData = {
        metadata: {
          exported: new Date().toISOString(),
          version: this.hardwareSpecs?.metadata?.version || '1.0',
          tool: 'MinIO Hardware Calculator'
        },
        configuration: config,
        hardware_specs_version: this.hardwareSpecs?.metadata?.version
      };
  
      return JSON.stringify(exportData, null, 2);
    }
  
    /**
     * Clear cached data
     */
    clearCache(): void {
      this.hardwareSpecs = null;
      this.error = null;
      console.log('🗑️ Hardware specs cache cleared');
    }
  }
  
  // Create singleton instance
  export const dataLoader = new DataLoader();
  
  // Convenience functions for common operations
  export async function loadHardwareSpecs(forceReload?: boolean): Promise<HardwareSpecs> {
    return dataLoader.loadHardwareSpecs(forceReload);
  }
  
  export function getVendors(): string[] {
    return dataLoader.getVendors();
  }
  
  export function getChassis(vendor?: string, sizeCategory?: string): ChassisSpec[] {
    return dataLoader.getChassis(vendor, sizeCategory);
  }
  
  export function getStorageDrives(filters?: FilterOptions): StorageDriveSpec[] {
    return dataLoader.getStorageDrives(filters);
  }
  
  export function getCPUs(filters?: FilterOptions): CPUSpec[] {
    return dataLoader.getCPUs(filters);
  }
  
  export function getMemory(filters?: FilterOptions): MemorySpec[] {
    return dataLoader.getMemory(filters);
  }
  
  export function getErasureCodingSchemes(): ErasureCodingConfig {
    return dataLoader.getErasureCodingSchemes();
  }
  
  export function getSizeCategories(): { [key: string]: SizeCategorySpec } {
    return dataLoader.getSizeCategories();
  }
  
  export function findOptimalDrive(capacityTB: number, formFactor?: string): StorageDriveSpec | null {
    return dataLoader.findOptimalDrive(capacityTB, formFactor);
  }
  
  export default dataLoader;