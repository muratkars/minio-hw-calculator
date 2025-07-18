import React, { useState, useEffect } from 'react';
import { HardwareSpecs } from '../utils/dataLoader';
import { ConfigurationResult, generateConfigurationWithValidation } from '../utils/calculations';

interface FormProps {
  hardwareSpecs: HardwareSpecs;
  onConfigurationUpdate: (config: ConfigurationResult) => void;
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
  cpuCores: number;
  memoryGB: number;
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

const Form: React.FC<FormProps> = ({ hardwareSpecs: initialHardwareSpecs, onConfigurationUpdate }) => {
  const [formData, setFormData] = useState<FormData>({
    usableCapacity: 400, // Default to Field Architect minimum
    capacityUnit: 'TB',
    vendor: '',
    serverSize: '',
    driveCapacity: 15.36,
    erasureCoding: 'EC 8:3',
    customerName: '',
    customerEmail: '',
    customerCompany: '',
    purchasePrice: 0,
    cpuCores: 96, // Default to above Field Architect minimum
    memoryGB: 256 // Default to Field Architect minimum
  });

  const [hardwareSpecs, setHardwareSpecs] = useState<HardwareSpecsLocal | null>(null);
  const [recommendedConfig, setRecommendedConfig] = useState<RecommendedConfig | null>(null);

  useEffect(() => {
    // Convert the props hardwareSpecs to local format
    if (initialHardwareSpecs) {
      setHardwareSpecs(initialHardwareSpecs as HardwareSpecsLocal);
      if (initialHardwareSpecs.vendors && Object.keys(initialHardwareSpecs.vendors).length > 0) {
        const defaultVendor = Object.keys(initialHardwareSpecs.vendors)[0];
        setFormData(prev => ({ ...prev, vendor: defaultVendor }));
      }
    }
  }, [initialHardwareSpecs]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['usableCapacity', 'driveCapacity', 'purchasePrice', 'cpuCores', 'memoryGB'].includes(name)
        ? parseFloat(value) || 0 
        : value
    }));
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

    // Get erasure coding scheme
    const ecScheme = hardwareSpecs.erasure_coding.schemes[formData.erasureCoding];
    if (!ecScheme) return null;

    // Convert capacity to TB
    const usableCapacityTB = convertToTB(formData.usableCapacity, formData.capacityUnit);
    
    // Calculate raw capacity needed
    const rawCapacityNeeded = usableCapacityTB / ecScheme.efficiency;
    
    // Calculate drives per server
    const drivesPerServer = suitableChassis.drive_bays;
    const capacityPerServer = drivesPerServer * formData.driveCapacity;
    
    // Calculate number of servers needed
    const serversNeeded = Math.ceil(rawCapacityNeeded / capacityPerServer);
    
    // Get recommended CPU and memory
    const recommendedCPU = hardwareSpecs.cpus.find(cpu => cpu.preferred === 1) || hardwareSpecs.cpus[0];
    const recommendedMemory = hardwareSpecs.memory.find(mem => mem.preferred === 1) || hardwareSpecs.memory[0];
    
    // Get drive performance
    const selectedDrive = hardwareSpecs.storage_drives.find(drive => 
      drive.capacity_tb === formData.driveCapacity
    );
    
    // Calculate performance metrics
    const totalBandwidth = selectedDrive 
      ? serversNeeded * drivesPerServer * (selectedDrive.seq_read_mbps / 1000) // Convert to GB/s
      : 0;
    
    const totalPower = selectedDrive 
      ? serversNeeded * (drivesPerServer * selectedDrive.power_active_w + 500) // +500W for server overhead
      : 0;

    const rackUnits = serversNeeded * (suitableChassis.form_factor === '1U' ? 1 : 2);

    return {
      servers: serversNeeded,
      chassisModel: suitableChassis.model,
      totalRawCapacity: serversNeeded * capacityPerServer,
      totalUsableCapacity: (serversNeeded * capacityPerServer) * ecScheme.efficiency,
      cpu: recommendedCPU?.model || 'N/A',
      memory: recommendedMemory ? `${recommendedMemory.size_gb}GB ${recommendedMemory.speed}` : 'N/A',
      storagePerServer: capacityPerServer,
      totalBandwidth,
      totalPower,
      rackUnits
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
            
            const validatedConfig = generateConfigurationWithValidation(
              convertToTB(formData.usableCapacity, formData.capacityUnit),
              ecScheme,
              chassis as any,
              selectedDrive as any,
              formData.cpuCores,
              formData.memoryGB,
              formData.purchasePrice > 0 ? formData.purchasePrice : undefined
            );
            
            onConfigurationUpdate(validatedConfig as any);
          } else {
            // Fallback to basic configuration
            const configurationResult: ConfigurationResult = {
              servers: config.servers,
              chassisModel: config.chassisModel,
              drivesPerServer: Math.floor(config.storagePerServer / formData.driveCapacity),
              totalDrives: config.servers * Math.floor(config.storagePerServer / formData.driveCapacity),
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
  }, [formData, hardwareSpecs, initialHardwareSpecs, onConfigurationUpdate]);

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Server Size
                  </label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Erasure Coding
                  </label>
                  <select
                    name="erasureCoding"
                    value={formData.erasureCoding}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(hardwareSpecs.erasure_coding.schemes).map(([scheme, config]) => (
                      <option key={scheme} value={scheme}>
                        {scheme} - {Math.round(config.efficiency * 100)}% efficiency, {config.fault_tolerance} drive fault tolerance
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPU Cores <span className="text-xs text-gray-500">(Min: 92)</span>
                    </label>
                    <input
                      type="number"
                      name="cpuCores"
                      value={formData.cpuCores}
                      onChange={handleInputChange}
                      min="1"
                      max="256"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 96"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory (GB) <span className="text-xs text-gray-500">(Min: 256GB)</span>
                    </label>
                    <input
                      type="number"
                      name="memoryGB"
                      value={formData.memoryGB}
                      onChange={handleInputChange}
                      min="1"
                      max="2048"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 512"
                    />
                  </div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price (Optional)
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter total purchase price"
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
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">
                Recommended Configuration
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
                      <div className="text-lg">{recommendedConfig.totalRawCapacity.toFixed(2)} TB</div>
                    </div>
                    <div>
                      <span className="font-medium">Usable Capacity:</span>
                      <div className="text-lg">{recommendedConfig.totalUsableCapacity.toFixed(2)} TB</div>
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
                      <span className="font-medium">Total Bandwidth:</span>
                      <div className="text-lg">{recommendedConfig.totalBandwidth.toFixed(1)} GB/s</div>
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
                      <div className="text-lg">{recommendedConfig.storagePerServer.toFixed(1)} TB</div>
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

          {/* Erasure Coding Info */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Erasure Coding Information</h3>
            {formData.erasureCoding && hardwareSpecs.erasure_coding.schemes[formData.erasureCoding] && (
              <div className="text-sm space-y-2">
                {(() => {
                  const scheme = hardwareSpecs.erasure_coding.schemes[formData.erasureCoding];
                  return (
                    <>
                      <p><strong>Scheme:</strong> {formData.erasureCoding}</p>
                      <p><strong>Efficiency:</strong> {Math.round(scheme.efficiency * 100)}%</p>
                      <p><strong>Fault Tolerance:</strong> {scheme.fault_tolerance} drives</p>
                      <p><strong>Minimum Drives:</strong> {scheme.min_drives}</p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form;