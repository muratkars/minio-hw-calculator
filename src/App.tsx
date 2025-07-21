import React, { useState, useEffect } from 'react';
import Form from './components/Form';
import RackVisualization from './components/RackVisualization';
import FieldArchitectRecommendations from './components/FieldArchitectRecommendations';
import { loadHardwareSpecs, HardwareSpecs } from './utils/dataLoader';
import { ConfigurationResult, formatCapacity, formatBandwidth } from './utils/calculations';
import './App.css';

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
}

interface AppState {
  hardwareSpecs: HardwareSpecs | null;
  currentConfig: ConfigurationResult | null;
  formData: FormData;
  loading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    hardwareSpecs: null,
    currentConfig: null,
    formData: {
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
      chassisModel: '',
      cpuModel: '',
      memoryModel: '',
      numDimms: 12, // Default recommendation
      numServers: 0, // 0 means auto-select
      numStorageDrives: 16,
      nicModel: '',
      numPorts: 2, // Default to 2 ports
      isCustomConfiguration: false
    },
    loading: true,
    error: null
  });

  const [activeTab, setActiveTab] = useState<'configure' | 'visualize' | 'architect' | 'export'>('configure');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const specs = await loadHardwareSpecs();
      setState(prev => ({ 
        ...prev, 
        hardwareSpecs: specs, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load application',
        loading: false 
      }));
    }
  };

  const handleConfigurationUpdate = (config: ConfigurationResult) => {
    setState(prev => ({ ...prev, currentConfig: config }));
  };

  const handleFormDataUpdate = (formData: FormData) => {
    setState(prev => ({ ...prev, formData }));
  };

  const handleExportConfiguration = () => {
    if (!state.currentConfig) return;

    const configData = {
      timestamp: new Date().toISOString(),
      configuration: state.currentConfig,
      metadata: state.hardwareSpecs?.metadata
    };

    const dataStr = JSON.stringify(configData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `minio-config-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderLoadingState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading MinIO Calculator</h2>
        <p className="text-gray-600">Initializing hardware specifications...</p>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h2>
        <p className="text-gray-600 mb-4">{state.error}</p>
        <button
          onClick={initializeApp}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    </div>
  );

  const renderTabButton = (
    tab: typeof activeTab, 
    label: string, 
    icon: React.ReactNode,
    disabled: boolean = false
  ) => (
    <button
      onClick={() => !disabled && setActiveTab(tab)}
      disabled={disabled}
      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  if (state.loading) return renderLoadingState();
  if (state.error) return renderErrorState();
  if (!state.hardwareSpecs) return renderErrorState();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  MinIO Hardware Calculator
                </h1>
              </div>
              <div className="hidden md:block">
                <span className="text-sm text-gray-500">
                  v{state.hardwareSpecs.metadata.version}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {state.currentConfig && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {state.currentConfig.servers} servers
                  </span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">
                    {formatCapacity(state.currentConfig.usableCapacityTB)} usable
                  </span>
                </div>
              )}
              
              <button
                onClick={handleExportConfiguration}
                disabled={!state.currentConfig}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Export Config
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4">
            {renderTabButton(
              'configure',
              'Configure',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            
            {renderTabButton(
              'visualize',
              'Visualize',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>,
              !state.currentConfig
            )}
            
            {renderTabButton(
              'architect',
              'Field Architect',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            
            {renderTabButton(
              'export',
              'Export & Reports',
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>,
              !state.currentConfig
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'configure' && (
          <Form 
            hardwareSpecs={state.hardwareSpecs}
            formData={state.formData}
            onConfigurationUpdate={handleConfigurationUpdate}
            onFormDataUpdate={handleFormDataUpdate}
          />
        )}
        
        {activeTab === 'visualize' && state.currentConfig && (
          <div className="space-y-6">
            <RackVisualization
              servers={state.currentConfig.servers}
              chassisModel={state.currentConfig.chassisModel}
              formFactor={state.currentConfig.chassisModel.includes('2U') ? '2U' : '1U'}
              totalPowerW={state.currentConfig.performance.powerConsumptionW}
              totalBandwidthGBps={state.currentConfig.performance.aggregateBandwidthGBps}
              rackUnits={state.currentConfig.rackUnits}
              drivesPerServer={state.currentConfig.drivesPerServer}
              totalDrives={state.currentConfig.totalDrives}
            />
            
            {/* Performance Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatBandwidth(state.currentConfig.performance.aggregateBandwidthGBps).split(' ')[0]}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatBandwidth(state.currentConfig.performance.aggregateBandwidthGBps).split(' ')[1]} Bandwidth
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {(state.currentConfig.performance.totalIOPS / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-gray-600">IOPS</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {(state.currentConfig.performance.powerConsumptionW / 1000).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">kW Power</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'architect' && (
          <div className="space-y-6">
            <FieldArchitectRecommendations showBestPractices={true} />
            
            {state.currentConfig && (state.currentConfig as any).fieldArchitectValidation && (
              <FieldArchitectRecommendations
                validationResults={(state.currentConfig as any).fieldArchitectValidation}
                recommendations={(state.currentConfig as any).recommendations}
                isCompliant={(state.currentConfig as any).isFieldArchitectCompliant}
              />
            )}
          </div>
        )}
        
        {activeTab === 'export' && state.currentConfig && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Export Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Configuration Report</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportConfiguration}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Download JSON Configuration
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Print Configuration
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Sharing</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        alert('URL copied to clipboard');
                      }}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Copy Share URL
                    </button>
                    <button
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onClick={() => alert('Email functionality would be implemented here')}
                    >
                      Email Configuration
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Configuration Summary for Export */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Current Configuration Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Servers:</span>
                    <div>{state.currentConfig.servers}</div>
                  </div>
                  <div>
                    <span className="font-medium">Raw Capacity:</span>
                    <div>{formatCapacity(state.currentConfig.rawCapacityTB)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Usable Capacity:</span>
                    <div>{formatCapacity(state.currentConfig.usableCapacityTB)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Efficiency:</span>
                    <div>{(state.currentConfig.efficiency * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="font-medium">Chassis:</span>
                    <div>{state.currentConfig.chassisModel}</div>
                  </div>
                  <div>
                    <span className="font-medium">Drives per Server:</span>
                    <div>{state.currentConfig.drivesPerServer}</div>
                  </div>
                  <div>
                    <span className="font-medium">Total Drives:</span>
                    <div>{state.currentConfig.totalDrives}</div>
                  </div>
                  <div>
                    <span className="font-medium">Rack Units:</span>
                    <div>{state.currentConfig.rackUnits}U</div>
                  </div>
                </div>
                
                {state.currentConfig.costAnalysis && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium mb-2">Cost Analysis</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Purchase Price:</span>
                        <div>${state.currentConfig.costAnalysis.purchasePrice.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Monthly Depreciation:</span>
                        <div>${state.currentConfig.costAnalysis.monthlyDepreciation.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Monthly Power Cost:</span>
                        <div>${state.currentConfig.costAnalysis.monthlyPowerCost.toFixed(0)}</div>
                      </div>
                      <div>
                        <span className="font-medium">5-Year TCO:</span>
                        <div>${state.currentConfig.costAnalysis.fiveYearTCO.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-sm text-gray-600">
                MinIO Hardware Calculator helps you design optimal storage configurations 
                for your object storage needs with accurate capacity planning and performance estimates.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Erasure coding calculations</li>
                <li>• Performance optimization</li>
                <li>• Cost analysis</li>
                <li>• Rack space planning</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <a href="#" className="hover:text-gray-900">Documentation</a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">GitHub Repository</a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">Report Issues</a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">Contact Support</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Generated on {new Date(state.hardwareSpecs.metadata.generated).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Hardware specs version {state.hardwareSpecs.metadata.version}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;