import React, { useState, useEffect } from 'react';
import { HardwareSpecs } from '../utils/dataLoader';
import { ConfigurationResult, generateConfigurationWithValidation, ErasureCodingScheme, formatCapacity, formatBandwidth } from '../utils/calculations';
import { FIELD_ARCHITECT_RULES } from '../config/field-architect-best-practices';
import ErasureCodingSelector from './ErasureCodingSelector';
import { getDefaultSchemeName, getAutoRecommendedSchemeName, convertToScheme, loadErasureCodingOptions } from '../utils/erasureCodingLoader';

interface FormData {
  usableCapacity: number;
  capacityUnit: string;
  vendor: string;
  serverSize: string;
  driveCapacity: number;
  erasureCoding: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  purchasePrice: number;
  chassisModel: string;
  cpuModel: string;
  memoryModel: string;
  numDimms: number;
  numServers: number;
  numStorageDrives: number;
  nicModel: string;
  numPorts: number;
  isCustomConfiguration: boolean;
  selectedECScheme?: ErasureCodingScheme;
}

interface FormProps {
  hardwareSpecs: HardwareSpecs;
  formData: FormData;
  onConfigurationUpdate: (config: ConfigurationResult) => void;
  onFormDataUpdate: (formData: FormData) => void;
}

interface HardwareSpecsLocal {
  metadata: {
    version: string;
    generated: string;
    description: string;
  };
  vendors: {
    [key: string]: {
      name: string;
      chassis: {
        [key: string]: {
          model: string;
          form_factor: string;
          drive_bays: number;
          drive_types: string;
          size_category: string;
          psu: string;
          depth: string;
          vendor_link: string;
          preferred: number;
        };
      };
      supported_sizes: string[];
    };
  };
  storage_drives: Array<{
    vendor: string;
    model: string;
    capacity_tb: number;
    seq_read_mbps: number;
    seq_write_mbps: number;
    power_active_w: number;
    form_factor: string;
    preferred: number;
  }>;
  cpus: Array<{
    vendor: string;
    model: string;
    cores: number;
    threads: number;
    tdp: string;
    preferred: number;
  }>;
  memory: Array<{
    vendor: string;
    model: string;
    size_gb: number;
    speed: string;
    preferred: number;
  }>;
  erasure_coding: {
    default_scheme: string;
    schemes: {
      [key: string]: {
        data_blocks: number;
        parity_blocks: number;
        efficiency: number;
        min_drives: number;
        fault_tolerance: number;
      };
    };
  };
  size_categories: {
    [key: string]: {
      description: string;
      typical_form_factor: string;
      drive_bay_range: number[];
    };
  };
}

interface RecommendedConfig {
  servers: number;
  chassisModel: string;
  totalRawCapacity: number;
  totalUsableCapacity: number;
  cpu: string;
  memory: string;
  storagePerServer: number;
  totalBandwidth: number;
  totalPower: number;
  rackUnits: number;
}

const Form: React.FC<FormProps> = ({ hardwareSpecs: initialHardwareSpecs, formData, onConfigurationUpdate, onFormDataUpdate }) => {

  const [hardwareSpecs, setHardwareSpecs] = useState<HardwareSpecsLocal | null>(null);
  const [recommendedConfig, setRecommendedConfig] = useState<RecommendedConfig | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [ecValidation, setEcValidation] = useState<{ valid: boolean; warnings: string[]; errors: string[] }>({ valid: true, warnings: [], errors: [] });

  useEffect(() => {
    // Convert the props hardwareSpecs to local format
    if (initialHardwareSpecs) {
      setHardwareSpecs(initialHardwareSpecs as HardwareSpecsLocal);
      
      // Set default vendor if not set
      if (initialHardwareSpecs.vendors && Object.keys(initialHardwareSpecs.vendors).length > 0 && !formData.vendor) {
        const defaultVendor = Object.keys(initialHardwareSpecs.vendors)[0];
        onFormDataUpdate({ ...formData, vendor: defaultVendor });
      }
      
      // Set default erasure coding scheme to recommended if not set
      if (!formData.erasureCoding) {
        const defaultScheme = getDefaultSchemeName();
        onFormDataUpdate({ ...formData, erasureCoding: defaultScheme });
      }
    }
  }, [initialHardwareSpecs, formData, onFormDataUpdate]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newValue = ['usableCapacity', 'driveCapacity', 'purchasePrice', 'numDimms', 'numServers', 'numStorageDrives', 'numPorts'].includes(name)
      ? parseFloat(value) || 0 
      : value;
    
    const newData = { ...formData, [name]: newValue };
      
      // Auto-populate Advanced Options when server size is selected
      if (name === 'serverSize' && value && hardwareSpecs && formData.vendor) {
        const vendor = hardwareSpecs.vendors[formData.vendor];
        const chassis = Object.values(vendor?.chassis || {}).find(c => c.size_category === value);
        const recommendedCpu = hardwareSpecs.cpus.find(cpu => cpu.preferred === 1);
        const recommendedMemory = hardwareSpecs.memory.find(mem => mem.preferred === 1);
        
        if (chassis) {
          // Get max DIMM slots for the chassis
          let maxDimms = 12;
          if (chassis.model.includes('ASG-1115S-NE316R')) maxDimms = 12;
          else if (chassis.model.includes('ASG-2115S-NE332R')) maxDimms = 24;
          else if (chassis.model.includes('PowerEdge R7615')) maxDimms = 16;
          else if (chassis.model.includes('PowerEdge R7715')) maxDimms = 32;
          else if (chassis.model.includes('ProLiant DL325')) maxDimms = 16;
          else if (chassis.model.includes('ProLiant DL345')) maxDimms = 32;
          
          newData.chassisModel = chassis.model;
          newData.cpuModel = recommendedCpu?.model || '';
          newData.memoryModel = recommendedMemory?.model || '';
          newData.numDimms = maxDimms;
          newData.numServers = 0; // Auto-select
          newData.numStorageDrives = chassis.drive_bays;
          newData.nicModel = ''; // Auto-select recommended NIC
          newData.numPorts = 2; // Default to 2 ports
          newData.isCustomConfiguration = false;
          
          // Auto-update erasure coding scheme based on potential drive count
          const potentialDrives = chassis.drive_bays * (newData.numServers || 4); // Assume 4 servers if not set
          const recommendedScheme = getAutoRecommendedSchemeName(potentialDrives);
          if (recommendedScheme !== formData.erasureCoding) {
            newData.erasureCoding = recommendedScheme;
          }
        }
      }
      
      // Auto-update erasure coding when number of servers or drives changes
      if ((name === 'numServers' || name === 'numStorageDrives') && hardwareSpecs) {
        const totalDrives = (name === 'numServers' ? parseFloat(value) : formData.numServers || 4) * 
                           (name === 'numStorageDrives' ? parseFloat(value) : formData.numStorageDrives);
        
        if (totalDrives > 0) {
          const recommendedScheme = getAutoRecommendedSchemeName(totalDrives);
          if (recommendedScheme !== formData.erasureCoding) {
            newData.erasureCoding = recommendedScheme;
            // Also update the selected scheme for the component
            loadErasureCodingOptions().then(options => {
              const option = options.find(opt => opt.scheme_name === recommendedScheme);
              if (option) {
                newData.selectedECScheme = convertToScheme(option);
              }
            });
          }
        }
      }
      
      // Check if user is making custom changes to auto-populated fields
      if (['chassisModel', 'cpuModel', 'memoryModel', 'numDimms', 'numServers', 'numStorageDrives', 'nicModel', 'numPorts'].includes(name)) {
        // Only mark as custom if the value differs from the recommended
        if (formData.serverSize && hardwareSpecs && formData.vendor) {
          const vendor = hardwareSpecs.vendors[formData.vendor];
          const chassis = Object.values(vendor?.chassis || {}).find(c => c.size_category === formData.serverSize);
          const recommendedCpu = hardwareSpecs.cpus.find(cpu => cpu.preferred === 1);
          const recommendedMemory = hardwareSpecs.memory.find(mem => mem.preferred === 1);
          
          let isCustom = false;
          if (name === 'chassisModel' && value !== chassis?.model) isCustom = true;
          if (name === 'cpuModel' && value !== recommendedCpu?.model) isCustom = true;
          if (name === 'memoryModel' && value !== recommendedMemory?.model) isCustom = true;
          if (name === 'numServers' && parseFloat(value) !== 0) isCustom = true;
          if (name === 'numStorageDrives' && parseFloat(value) !== chassis?.drive_bays) isCustom = true;
          if (name === 'nicModel' && value !== '') isCustom = true; // Any non-auto NIC selection is custom
          if (name === 'numPorts' && parseFloat(value) !== 2) isCustom = true;
          
          if (chassis) {
            let maxDimms = 12;
            if (chassis.model.includes('ASG-1115S-NE316R')) maxDimms = 12;
            else if (chassis.model.includes('ASG-2115S-NE332R')) maxDimms = 24;
            else if (chassis.model.includes('PowerEdge R7615')) maxDimms = 16;
            else if (chassis.model.includes('PowerEdge R7715')) maxDimms = 32;
            else if (chassis.model.includes('ProLiant DL325')) maxDimms = 16;
            else if (chassis.model.includes('ProLiant DL345')) maxDimms = 32;
            
            if (name === 'numDimms' && parseFloat(value) !== maxDimms) isCustom = true;
          }
          
          newData.isCustomConfiguration = isCustom || formData.isCustomConfiguration;
        }
      }
      
      onFormDataUpdate(newData);
  };

  const convertToTB = (capacity: number, unit: string): number => {
    switch (unit) {
      case 'GB': return capacity / 1000;
      case 'TB': return capacity;
      case 'PB': return capacity * 1000;
      case 'EB': return capacity * 1000000;
      default: return capacity;
    }
  };

  const calculateConfiguration = (): RecommendedConfig | null => {
    if (!hardwareSpecs || !formData.vendor) return null;

    const vendor = hardwareSpecs.vendors[formData.vendor];
    if (!vendor) return null;

    // Find suitable chassis based on server size
    const suitableChassis = Object.values(vendor.chassis).find(chassis => 
      chassis.size_category === formData.serverSize
    );
    if (!suitableChassis) return null;

    // Get erasure coding scheme - prioritize selectedECScheme if available
    let ecScheme;
    if (formData.selectedECScheme) {
      // Use the efficiency from the selected scheme
      ecScheme = {
        data_blocks: formData.selectedECScheme.data_shards,
        parity_blocks: formData.selectedECScheme.parity_shards,
        efficiency: formData.selectedECScheme.storage_efficiency,
        min_drives: formData.selectedECScheme.min_drives,
        fault_tolerance: formData.selectedECScheme.fault_tolerance
      };
    } else {
      // Fallback to legacy format or default
      ecScheme = hardwareSpecs.erasure_coding?.schemes?.[formData.erasureCoding] || {
        data_blocks: 5,
        parity_blocks: 3,
        efficiency: 0.625,
        min_drives: 8,
        fault_tolerance: 3
      };
    }

    // Convert capacity to TB
    const usableCapacityTB = convertToTB(formData.usableCapacity, formData.capacityUnit);
    
    // Calculate raw capacity needed (if no usable capacity specified, use 100TB default)
    const targetUsable = usableCapacityTB || 100;
    const rawCapacityNeeded = targetUsable / ecScheme.efficiency;
    
    // Use custom number of drives if specified, otherwise use chassis max
    const drivesPerServer = formData.numStorageDrives || suitableChassis.drive_bays;
    // Use default drive capacity if not specified
    const driveCapacity = formData.driveCapacity || 8; // Default to 8TB
    const capacityPerServer = drivesPerServer * driveCapacity;
    
    // Use custom number of servers if specified (> 0), otherwise calculate needed
    let serversNeeded = formData.numServers > 0 
      ? formData.numServers 
      : Math.ceil(rawCapacityNeeded / capacityPerServer);
    
    // Apply Field Architect minimum server count rule
    const minServersFieldArchitect = FIELD_ARCHITECT_RULES.servers.minimumCount;
    serversNeeded = Math.max(serversNeeded, minServersFieldArchitect);
    
    // Get CPU and memory (use selected or fall back to recommended)
    const selectedCpu = formData.cpuModel 
      ? hardwareSpecs.cpus.find(cpu => cpu.model === formData.cpuModel)
      : hardwareSpecs.cpus.find(cpu => cpu.preferred === 1) || hardwareSpecs.cpus[0];
    
    const selectedMemory = formData.memoryModel
      ? hardwareSpecs.memory.find(mem => mem.model === formData.memoryModel)
      : hardwareSpecs.memory.find(mem => mem.preferred === 1) || hardwareSpecs.memory[0];
    
    const totalMemoryGB = selectedMemory ? (selectedMemory.size_gb * formData.numDimms) : 256;
    
    // Get drive performance
    const selectedDrive = hardwareSpecs.storage_drives.find(drive => 
      drive.capacity_tb === driveCapacity
    ) || hardwareSpecs.storage_drives[0]; // Fallback to first drive if not found
    
    // Calculate performance metrics
    const totalBandwidth = selectedDrive 
      ? serversNeeded * drivesPerServer * (selectedDrive.seq_read_mbps / 1000) // Convert to GB/s
      : 0;
    
    const totalPower = selectedDrive 
      ? serversNeeded * (drivesPerServer * selectedDrive.power_active_w + 500) // +500W for server overhead
      : 0;

    const rackUnits = serversNeeded * (suitableChassis.form_factor === '1U' ? 1 : 2);

    // Ensure we have valid values
    const finalServers = serversNeeded || 1;
    const finalCapacityPerServer = capacityPerServer || 128;
    
    return {
      servers: finalServers,
      chassisModel: suitableChassis.model,
      totalRawCapacity: finalServers * finalCapacityPerServer,
      totalUsableCapacity: (finalServers * finalCapacityPerServer) * (ecScheme.efficiency || 0.625),
      cpu: selectedCpu?.model || 'N/A',
      memory: selectedMemory ? `${totalMemoryGB}GB (${formData.numDimms || 16}x ${selectedMemory.size_gb}GB ${selectedMemory.speed})` : '256GB',
      storagePerServer: finalCapacityPerServer,
      totalBandwidth: totalBandwidth || 0,
      totalPower: totalPower || 0,
      rackUnits: rackUnits || finalServers
    };
  };

  useEffect(() => {
    if (hardwareSpecs && formData.vendor && formData.serverSize) {
      const config = calculateConfiguration();
      setRecommendedConfig(config);
      
      // Use the new Field Architect validation function
      if (config && initialHardwareSpecs) {
        try {
          // Find the vendor and chassis for validation
          const vendor = initialHardwareSpecs.vendors[formData.vendor];
          const chassis = vendor?.chassis ? Object.values(vendor.chassis).find(c => 
            c.size_category === formData.serverSize
          ) : null;
          
          const selectedDrive = initialHardwareSpecs.storage_drives.find(drive => 
            drive.capacity_tb === formData.driveCapacity
          );
          
          if (chassis && selectedDrive) {
            // Convert to the expected format for calculations
            const ecScheme = initialHardwareSpecs.erasure_coding.schemes[formData.erasureCoding];
            
            // Calculate CPU cores and memory from selected models
            const selectedCpu = initialHardwareSpecs.cpus.find(cpu => cpu.model === formData.cpuModel);
            const selectedMemory = initialHardwareSpecs.memory.find(mem => mem.model === formData.memoryModel);
            const cpuCores = selectedCpu?.cores || 96; // fallback
            const totalMemoryGB = selectedMemory ? (selectedMemory.size_gb * formData.numDimms) : 256; // fallback
            
            // Use the selected EC scheme from the new component if available
            const activeEcScheme = formData.selectedECScheme || {
              scheme_name: ecScheme ? Object.keys(initialHardwareSpecs.erasure_coding.schemes).find(key => 
                initialHardwareSpecs.erasure_coding.schemes[key] === ecScheme
              ) || 'EC8:3' : 'EC8:3',
              data_shards: ecScheme?.data_blocks || 8,
              parity_shards: ecScheme?.parity_blocks || 3,
              total_shards: ecScheme?.total_blocks || 11,
              storage_efficiency: ecScheme?.efficiency || 0.727,
              fault_tolerance: ecScheme?.fault_tolerance || 3,
              min_drives: ecScheme?.min_drives || 11,
              recommended: true,
              drive_distribution: ecScheme?.total_blocks || 11,
              description: 'Legacy scheme',
              // Legacy support
              data_blocks: ecScheme?.data_blocks || 8,
              parity_blocks: ecScheme?.parity_blocks || 3,
              total_blocks: ecScheme?.total_blocks || 11,
              efficiency: ecScheme?.efficiency || 0.727
            };

            const validatedConfig = generateConfigurationWithValidation(
              convertToTB(formData.usableCapacity, formData.capacityUnit),
              activeEcScheme,
              chassis as any,
              selectedDrive as any,
              cpuCores,
              totalMemoryGB,
              formData.purchasePrice > 0 ? formData.purchasePrice : undefined
            );
            
            onConfigurationUpdate(validatedConfig as any);
          } else {
            // Fallback to basic configuration
            const configurationResult: ConfigurationResult = {
              servers: config.servers,
              chassisModel: config.chassisModel,
              drivesPerServer: formData.numStorageDrives,
              totalDrives: config.servers * formData.numStorageDrives,
              rawCapacityTB: config.totalRawCapacity,
              usableCapacityTB: config.totalUsableCapacity,
              efficiency: config.totalUsableCapacity / config.totalRawCapacity,
              rackUnits: config.rackUnits,
              performance: {
                aggregateBandwidthGBps: config.totalBandwidth,
                totalIOPS: 0,
                powerConsumptionW: config.totalPower,
                powerConsumptionKWhPerMonth: (config.totalPower * 24 * 30) / 1000,
                thermalBTUPerHour: config.totalPower * 3.412
              }
            };
            onConfigurationUpdate(configurationResult);
          }
        } catch (error) {
          console.error('Error generating Field Architect validation:', error);
        }
      }
    }
  }, [formData, hardwareSpecs, initialHardwareSpecs, onConfigurationUpdate, formData.erasureCoding, formData.selectedECScheme]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recommendedConfig) {
      alert('Please complete the configuration first');
      return;
    }

    // Here you would typically send the data to a backend
    console.log('Configuration submitted:', { formData, recommendedConfig });
    
    // Generate a unique configuration ID
    const configId = `minio-config-${Date.now()}`;
    
    // Save configuration (in a real app, this would go to a backend)
    localStorage.setItem(configId, JSON.stringify({ 
      formData, 
      recommendedConfig, 
      timestamp: new Date().toISOString() 
    }));
    
    alert(`Configuration saved with ID: ${configId}`);
  };

  const exportToPDF = () => {
    if (!recommendedConfig) return;
    
    // This would integrate with jsPDF in a real implementation
    const configData = {
      customer: {
        name: formData.customerName,
        email: formData.customerEmail,
        company: formData.customerCompany
      },
      requirements: {
        usableCapacity: `${formData.usableCapacity} ${formData.capacityUnit}`,
        vendor: formData.vendor,
        serverSize: formData.serverSize,
        erasureCoding: formData.erasureCoding
      },
      recommendation: recommendedConfig
    };
    
    console.log('PDF Export Data:', configData);
    alert('PDF export functionality would be implemented here');
  };

  if (!hardwareSpecs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading hardware specifications...</div>
      </div>
    );
  }

  const availableVendors = Object.keys(hardwareSpecs.vendors);
  const availableSizes = formData.vendor 
    ? hardwareSpecs.vendors[formData.vendor]?.supported_sizes || []
    : [];

  const availableDrives = hardwareSpecs.storage_drives
    .filter(drive => drive.preferred <= 2)
    .sort((a, b) => a.preferred - b.preferred);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          MinIO Hardware Calculator
        </h1>
        <p className="text-gray-600">
          Configure your MinIO deployment with optimal hardware recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Capacity Requirements */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Capacity Requirements</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usable Capacity
                  </label>
                  <input
                    type="number"
                    name="usableCapacity"
                    value={formData.usableCapacity}
                    onChange={handleInputChange}
                    min="0.4"
                    max="100000"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="capacityUnit"
                    value={formData.capacityUnit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                    <option value="PB">PB</option>
                    <option value="EB">EB</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hardware Selection */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Hardware Selection</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor
                  </label>
                  <select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {availableVendors.map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Server Size
                    </label>
                    <div className="relative group">
                      <button 
                        type="button"
                        className="w-4 h-4 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200"
                      >
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        <strong>Server Size:</strong> Server sizes are based on the T-Shirt size configuration available through Arrow as of now. If components should be changed or configuration needed for other hardware use the Advanced Options.
                      </div>
                    </div>
                  </div>
                  <select
                    name="serverSize"
                    value={formData.serverSize}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!formData.vendor}
                  >
                    <option value="">Select Size</option>
                    {availableSizes.map(size => (
                      <option key={size} value={size}>
                        {size.charAt(0).toUpperCase() + size.slice(1)} - {hardwareSpecs.size_categories[size]?.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drive Capacity
                  </label>
                  <select
                    name="driveCapacity"
                    value={formData.driveCapacity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableDrives.map(drive => (
                      <option key={`${drive.vendor}-${drive.model}-${drive.capacity_tb}`} value={drive.capacity_tb}>
                        {drive.capacity_tb}TB - {drive.vendor} {drive.model}
                        {drive.preferred === 1 && ' (Recommended)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* New Erasure Coding Selector */}
                <ErasureCodingSelector
                  selectedScheme={formData.erasureCoding || getDefaultSchemeName()}
                  totalDrives={(formData.numServers || 4) * (formData.numStorageDrives || 16)}
                  onSchemeChange={(scheme) => {
                    const newData = { 
                      ...formData, 
                      erasureCoding: scheme.scheme_name,
                      selectedECScheme: scheme 
                    };
                    onFormDataUpdate(newData);
                  }}
                  onValidationChange={setEcValidation}
                  allowManualOverride={true}
                  showDetails={true}
                />
                
                {/* Advanced Options Toggle */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span>Advanced Options</span>
                    <span className={`transform transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {showAdvancedOptions && (
                    <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-md">
                      {/* Chassis Vendor/Model */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chassis Vendor/Model
                        </label>
                        <select
                          name="chassisModel"
                          value={formData.chassisModel}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Auto-select based on vendor and size</option>
                          {formData.vendor && hardwareSpecs && Object.entries(hardwareSpecs.vendors[formData.vendor]?.chassis || {}).map(([key, chassis]) => (
                            <option key={key} value={chassis.model}>
                              {formData.vendor} {chassis.model}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* CPU Model */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CPU Model <span className="text-xs text-gray-500">(Min: 92 cores)</span>
                        </label>
                        <select
                          name="cpuModel"
                          value={formData.cpuModel}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Auto-select recommended CPU</option>
                          {hardwareSpecs && hardwareSpecs.cpus
                            .filter(cpu => {
                              // For now, all chassis use SP5 socket and all CPUs are AMD SP5
                              // In the future, this can be enhanced with proper socket matching
                              // Currently showing all compatible CPUs (AMD for SP5 chassis)
                              return cpu.vendor === 'AMD'; // All current chassis support AMD CPUs
                            })
                            .sort((a, b) => a.preferred - b.preferred)
                            .map(cpu => (
                              <option key={cpu.model} value={cpu.model}>
                                {cpu.vendor} {cpu.model} ({cpu.cores} cores)
                                {cpu.preferred === 1 && ' (Recommended)'}
                              </option>
                            ))}
                        </select>
                      </div>
                      
                      {/* Memory and DIMMs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Memory Model <span className="text-xs text-gray-500">(Min: 256GB)</span>
                          </label>
                          <select
                            name="memoryModel"
                            value={formData.memoryModel}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Auto-select recommended memory</option>
                            {hardwareSpecs && hardwareSpecs.memory
                              .sort((a, b) => a.preferred - b.preferred)
                              .map(mem => (
                                <option key={mem.model} value={mem.model}>
                                  {mem.vendor} {mem.model} ({mem.size_gb}GB)
                                  {mem.preferred === 1 && ' (Recommended)'}
                                </option>
                              ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            # of DIMMs
                          </label>
                          <select
                            name="numDimms"
                            value={formData.numDimms}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {/* Generate DIMM options based on selected chassis */}
                            {(() => {
                              let maxDimms = 32; // Default fallback
                              
                              if (formData.vendor && formData.serverSize && hardwareSpecs) {
                                const selectedChassis = Object.values(hardwareSpecs.vendors[formData.vendor]?.chassis || {})
                                  .find(chassis => chassis.size_category === formData.serverSize);
                                
                                if (selectedChassis) {
                                  // Extract DIMM count from memory slots description
                                  if (selectedChassis.model.includes('ASG-1115S-NE316R')) maxDimms = 12;
                                  else if (selectedChassis.model.includes('ASG-2115S-NE332R')) maxDimms = 24;
                                  else if (selectedChassis.model.includes('PowerEdge R7615')) maxDimms = 16;
                                  else if (selectedChassis.model.includes('PowerEdge R7715')) maxDimms = 32;
                                  else if (selectedChassis.model.includes('ProLiant DL325')) maxDimms = 16;
                                  else if (selectedChassis.model.includes('ProLiant DL345')) maxDimms = 32;
                                }
                              }
                              
                              const options = [];
                              for (let i = 1; i <= maxDimms; i++) {
                                options.push(
                                  <option key={i} value={i}>
                                    {i} {i === maxDimms && '(All slots)'}
                                  </option>
                                );
                              }
                              return options;
                            })()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Total Memory Display */}
                      {formData.memoryModel && formData.numDimms && hardwareSpecs && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="text-sm text-blue-700">
                            <strong>Total Memory:</strong> {
                              (() => {
                                const selectedMemory = hardwareSpecs.memory.find(mem => mem.model === formData.memoryModel);
                                return selectedMemory ? (selectedMemory.size_gb * formData.numDimms) : 0;
                              })()
                            }GB
                          </div>
                        </div>
                      )}
                      
                      {/* Number of Servers and Storage Drives */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Number of Servers
                          </label>
                          <select
                            name="numServers"
                            value={formData.numServers}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={0}>Auto-select</option>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>
                                {num} {num === 1 ? 'server' : 'servers'}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Storage Drives per Server
                          </label>
                          <select
                            name="numStorageDrives"
                            value={formData.numStorageDrives}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(() => {
                              const maxDrives = formData.vendor && formData.serverSize && hardwareSpecs 
                                ? Object.values(hardwareSpecs.vendors[formData.vendor]?.chassis || {})
                                    .find(chassis => chassis.size_category === formData.serverSize)?.drive_bays || 32
                                : 32;
                              
                              return Array.from({ length: maxDrives }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>
                                  {num} {num === maxDrives ? `(max: ${maxDrives})` : 'drives'}
                                </option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Total Storage Display */}
                      {formData.numStorageDrives && formData.driveCapacity && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="text-sm text-blue-700">
                            <strong>Storage per Server:</strong> {formData.numStorageDrives} × {formData.driveCapacity}TB = {formatCapacity(formData.numStorageDrives * formData.driveCapacity)}
                          </div>
                        </div>
                      )}
                      
                      {/* NIC Model and # of Ports */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            NIC Model
                          </label>
                          <select
                            name="nicModel"
                            value={formData.nicModel}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Auto-select recommended NIC</option>
                            <option value="Intel X710-T2L">Intel X710-T2L (10GbE)</option>
                            <option value="Intel X710-DA2">Intel X710-DA2 (10GbE SFP+)</option>
                            <option value="Mellanox ConnectX-6 Dx">Mellanox ConnectX-6 Dx (25GbE)</option>
                            <option value="Mellanox ConnectX-7">Mellanox ConnectX-7 (100GbE)</option>
                            <option value="Broadcom 57414">Broadcom 57414 (25GbE)</option>
                            <option value="Intel E810-CQDA2">Intel E810-CQDA2 (100GbE)</option>
                            <option value="Mellanox ConnectX-6 Lx">Mellanox ConnectX-6 Lx (25GbE)</option>
                            <option value="Intel X710-DA4">Intel X710-DA4 (10GbE Quad Port)</option>
                            <option value="Broadcom 57508">Broadcom 57508 (50GbE)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            # of Ports
                          </label>
                          <select
                            name="numPorts"
                            value={formData.numPorts}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={1}>1 port</option>
                            <option value={2}>2 ports</option>
                            <option value={4}>4 ports</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Purchase Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Purchase Price of Server (Optional)
                        </label>
                        <input
                          type="number"
                          name="purchasePrice"
                          value={formData.purchasePrice}
                          onChange={handleInputChange}
                          min="0"
                          step="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter server purchase price"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="customerCompany"
                    value={formData.customerCompany}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                Save Configuration
              </button>
              
              {recommendedConfig && (
                <button
                  type="button"
                  onClick={exportToPDF}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                >
                  Export PDF
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Recommended Configuration */}
        <div className="space-y-6">
          {recommendedConfig ? (
            <div className={`p-6 rounded-lg ${formData.isCustomConfiguration ? 'bg-orange-50 border-2 border-orange-200' : 'bg-blue-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${formData.isCustomConfiguration ? 'text-orange-900' : 'text-blue-900'}`}>
                {formData.isCustomConfiguration ? 'Custom Configuration' : 'Recommended Configuration'}
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-blue-700 font-medium">Servers Required</div>
                    <div className="text-2xl font-bold text-blue-900">{recommendedConfig.servers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700 font-medium">Chassis Model</div>
                    <div className="text-lg font-semibold text-blue-900">{recommendedConfig.chassisModel}</div>
                  </div>
                </div>

                <div className="border-t border-blue-200 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Raw Capacity:</span>
                      <div className="text-lg">{formatCapacity(recommendedConfig.totalRawCapacity)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Usable Capacity:</span>
                      <div className="text-lg">{formatCapacity(recommendedConfig.totalUsableCapacity)}</div>
                    </div>
                    <div>
                      <span className="font-medium">CPU:</span>
                      <div className="text-sm">{recommendedConfig.cpu}</div>
                    </div>
                    <div>
                      <span className="font-medium">Memory:</span>
                      <div className="text-sm">{recommendedConfig.memory}</div>
                    </div>
                    <div>
                      <span className="font-medium">Storage Drives:</span>
                      <div className="text-sm">
                        {formData.numStorageDrives} × {formData.driveCapacity}TB = {formatCapacity(formData.numStorageDrives * formData.driveCapacity)} per server
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Total Bandwidth:</span>
                      <div className="text-lg">{formatBandwidth(recommendedConfig.totalBandwidth)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total Power:</span>
                      <div className="text-lg">{recommendedConfig.totalPower.toFixed(0)} W</div>
                    </div>
                    <div>
                      <span className="font-medium">Rack Units:</span>
                      <div className="text-lg">{recommendedConfig.rackUnits} U</div>
                    </div>
                    <div>
                      <span className="font-medium">Storage/Server:</span>
                      <div className="text-lg">{formatCapacity(recommendedConfig.storagePerServer)}</div>
                    </div>
                  </div>
                </div>

                {formData.purchasePrice > 0 && (
                  <div className="border-t border-blue-200 pt-4">
                    <h3 className="font-medium text-blue-900 mb-2">Cost Analysis</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">5-Year Depreciation:</span>
                        <div>${(formData.purchasePrice / 5).toLocaleString()}/year</div>
                      </div>
                      <div>
                        <span className="font-medium">Monthly Power Cost:</span>
                        <div>${((recommendedConfig.totalPower * 24 * 30 * 0.12) / 1000).toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                Configuration Preview
              </h2>
              <p className="text-gray-600">
                Complete the form to see hardware recommendations
              </p>
            </div>
          )}

          {/* Erasure Coding Validation - Only show if configuration is meaningfully selected */}
          {(ecValidation.warnings.length > 0 || ecValidation.errors.length > 0) && 
           formData.vendor && formData.serverSize && formData.driveCapacity && 
           (formData.numServers > 0 || formData.numStorageDrives > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-yellow-800">Erasure Coding Validation</h3>
              
              {ecValidation.errors.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-red-700 mb-2">❌ Errors:</h4>
                  <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                    {ecValidation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {ecValidation.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2">⚠️ Warnings:</h4>
                  <ul className="list-disc pl-5 text-sm text-yellow-600 space-y-1">
                    {ecValidation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form;