import React, { useState, useMemo } from 'react';
import { ServerVisual, NetworkSwitchVisual, PDUVisual, ManagementServerVisual } from './ServerVisuals';

interface RackVisualizationProps {
  servers: number;
  chassisModel: string;
  formFactor: string;
  totalPowerW: number;
  totalBandwidthGBps: number;
  rackUnits: number;
  drivesPerServer?: number;
  totalDrives?: number;
}

interface RackComponent {
  id: string;
  type: 'server' | 'switch' | 'pdu' | 'management' | 'empty';
  position: number; // U position from bottom (1-42)
  height: number; // Height in U
  label: string;
  model?: string;
  color: string;
  icon?: string;
}

interface RackLayout {
  rackId: number;
  components: RackComponent[];
  totalPowerW: number;
  totalServers: number;
  utilization: number;
  specs: {
    maxPowerKW: number;
    coolingBTU: number;
    networkPorts: number;
  };
}

const RackVisualization: React.FC<RackVisualizationProps> = ({
  servers,
  chassisModel,
  formFactor,
  totalPowerW,
  totalBandwidthGBps,
  drivesPerServer = 16,
  totalDrives = 0
}) => {
  const [selectedRack, setSelectedRack] = useState<number>(0);

  // Server specifications mapping
  const serverSpecs = useMemo(() => {
    const specs: { [key: string]: { vendor: string; image: string; powerW: number; portsNeeded: number } } = {
      'ASG-2115S-NE332R': {
        vendor: 'Supermicro',
        image: '🖥️', // We'll use emojis for now, can be replaced with actual images
        powerW: 800,
        portsNeeded: 2
      },
      'ASG-1115S-NE316R': {
        vendor: 'Supermicro', 
        image: '💻',
        powerW: 600,
        portsNeeded: 2
      },
      'PowerEdge R7615': {
        vendor: 'Dell',
        image: '🖥️',
        powerW: 650,
        portsNeeded: 2
      },
      'PowerEdge R7715': {
        vendor: 'Dell',
        image: '🖥️',
        powerW: 750,
        portsNeeded: 2
      },
      'ProLiant DL325 Gen11': {
        vendor: 'HPE',
        image: '💻',
        powerW: 500,
        portsNeeded: 2
      },
      'ProLiant DL345 Gen11': {
        vendor: 'HPE',
        image: '💻',
        powerW: 650,
        portsNeeded: 2
      }
    };
    
    return specs[chassisModel] || {
      vendor: 'Generic',
      image: '🖥️',
      powerW: 700,
      portsNeeded: 2
    };
  }, [chassisModel]);

  // Calculate rack layouts
  const rackLayouts = useMemo((): RackLayout[] => {
    const layouts: RackLayout[] = [];
    const serverHeight = formFactor === '2U' ? 2 : 1;
    const maxUsableUnits = 37; // Leave space for management, switches, PDUs
    const serversPerRack = Math.floor(maxUsableUnits / serverHeight);
    const racksNeeded = Math.ceil(servers / serversPerRack);

    for (let rackIndex = 0; rackIndex < racksNeeded; rackIndex++) {
      const serversInThisRack = Math.min(
        serversPerRack,
        servers - (rackIndex * serversPerRack)
      );
      
      const components: RackComponent[] = [];
      let currentPosition = 1;

      // Add servers from bottom up
      for (let serverIndex = 0; serverIndex < serversInThisRack; serverIndex++) {
        components.push({
          id: `server-${rackIndex}-${serverIndex}`,
          type: 'server',
          position: currentPosition,
          height: serverHeight,
          label: `${chassisModel} #${(rackIndex * serversPerRack) + serverIndex + 1}`,
          model: chassisModel,
          color: '#3B82F6',
          icon: serverSpecs.image
        });
        currentPosition += serverHeight;
      }

      // Add ToR switches (2 for redundancy)
      const switchCount = 2;
      for (let i = 0; i < switchCount; i++) {
        components.push({
          id: `switch-${rackIndex}-${i}`,
          type: 'switch',
          position: currentPosition,
          height: 1,
          label: `ToR Switch ${i + 1}`,
          color: '#EF4444',
          icon: '🔀'
        });
        currentPosition += 1;
      }

      // Add PDUs (2 for redundancy)
      const pduCount = 2;
      for (let i = 0; i < pduCount; i++) {
        components.push({
          id: `pdu-${rackIndex}-${i}`,
          type: 'pdu',
          position: currentPosition,
          height: 1,
          label: `PDU ${i + 1}`,
          color: '#F59E0B',
          icon: '⚡'
        });
        currentPosition += 1;
      }

      // Add management server
      components.push({
        id: `mgmt-${rackIndex}`,
        type: 'management',
        position: currentPosition,
        height: 1,
        label: 'Management Server',
        color: '#10B981',
        icon: '⚙️'
      });
      currentPosition += 1;

      // Fill empty slots
      for (let pos = currentPosition; pos <= 42; pos++) {
        components.push({
          id: `empty-${rackIndex}-${pos}`,
          type: 'empty',
          position: pos,
          height: 1,
          label: 'Empty',
          color: '#F3F4F6',
          icon: ''
        });
      }

      const rackPowerW = serversInThisRack * serverSpecs.powerW + 500; // Additional for switches/management

      layouts.push({
        rackId: rackIndex,
        components,
        totalPowerW: rackPowerW,
        totalServers: serversInThisRack,
        utilization: Math.round(((currentPosition - 1) / 42) * 100),
        specs: {
          maxPowerKW: 15, // Standard rack power capacity
          coolingBTU: Math.round(rackPowerW * 3.412),
          networkPorts: serversInThisRack * serverSpecs.portsNeeded
        }
      });
    }

    return layouts;
  }, [servers, formFactor, chassisModel, serverSpecs]);

  const ServerIcon: React.FC<{ component: RackComponent }> = ({ component }) => {
    if (component.type === 'server') {
      return (
        <ServerVisual 
          model={component.model || chassisModel}
          formFactor={formFactor as '1U' | '2U'}
          vendor={serverSpecs.vendor}
        />
      );
    }
    
    if (component.type === 'switch') {
      return (
        <NetworkSwitchVisual 
          label={component.label}
          portCount={48}
        />
      );
    }
    
    if (component.type === 'pdu') {
      return (
        <PDUVisual 
          label={component.label}
          outletCount={24}
        />
      );
    }
    
    if (component.type === 'management') {
      return (
        <ManagementServerVisual 
          label={component.label}
        />
      );
    }
    
    return (
      <div className={`flex items-center justify-center w-full h-full text-white text-xs font-medium rounded`}
           style={{ backgroundColor: component.color }}>
        <span className="mr-1">{component.icon}</span>
        <span className="truncate">{component.label}</span>
      </div>
    );
  };

  const RackUnit: React.FC<{ 
    position: number; 
    components: RackComponent[]; 
    isHighlighted?: boolean 
  }> = ({ position, components, isHighlighted = false }) => {
    const component = components.find(c => 
      position >= c.position && position < c.position + c.height
    );
    
    const isFirstUnitOfComponent = component && position === component.position;
    
    if (!component || !isFirstUnitOfComponent) {
      return (
        <div className={`h-4 border-b border-gray-300 ${isHighlighted ? 'bg-yellow-100' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-400 px-1 leading-4">{42 - position + 1}</div>
        </div>
      );
    }

    const height = component.height * 16; // 16px per U
    
    return (
      <div 
        className={`border-b border-gray-300 relative ${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}
        style={{ height: `${height}px` }}
      >
        <div className="absolute left-0 top-0 w-6 h-full bg-gray-200 border-r border-gray-300 flex items-center justify-center">
          <span className="text-xs font-mono text-gray-600 transform -rotate-90">
            {42 - position + 1}
          </span>
        </div>
        <div className="ml-6 h-full p-0.5">
          <ServerIcon component={component} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rack Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Data Center Rack Layout</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{rackLayouts.length}</div>
            <div className="text-sm text-blue-800">Total Racks</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{servers}</div>
            <div className="text-sm text-green-800">Total Servers</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(totalPowerW / 1000)}kW
            </div>
            <div className="text-sm text-orange-800">Total Power</div>
          </div>
        </div>

        {/* Rack Selector */}
        {rackLayouts.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Rack to View:
            </label>
            <div className="flex flex-wrap gap-2">
              {rackLayouts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedRack(index)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    selectedRack === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Rack {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Rack Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 42U Rack Display */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <h4 className="text-md font-semibold mb-4">
            Rack {selectedRack + 1} - 42U Layout
          </h4>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="bg-gray-100 rounded border-2 border-gray-400" style={{ height: '672px' }}>
              {/* Rack frame */}
              <div className="h-full overflow-hidden">
                {Array.from({ length: 42 }, (_, i) => (
                  <RackUnit 
                    key={42 - i} 
                    position={42 - i} 
                    components={rackLayouts[selectedRack]?.components || []}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rack Specifications */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-md font-semibold mb-4">Rack {selectedRack + 1} Specifications</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Servers:</span>
                <span className="font-medium">{rackLayouts[selectedRack]?.totalServers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Utilization:</span>
                <span className="font-medium">{rackLayouts[selectedRack]?.utilization || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Power Draw:</span>
                <span className="font-medium">
                  {Math.round((rackLayouts[selectedRack]?.totalPowerW || 0) / 1000)}kW
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Max Power:</span>
                <span className="font-medium">
                  {rackLayouts[selectedRack]?.specs.maxPowerKW || 15}kW
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cooling Required:</span>
                <span className="font-medium">
                  {Math.round((rackLayouts[selectedRack]?.specs.coolingBTU || 0) / 1000)}k BTU/hr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Network Ports:</span>
                <span className="font-medium">{rackLayouts[selectedRack]?.specs.networkPorts || 0}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-md font-semibold mb-4">Component Legend</h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">MinIO Servers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">ToR Switches</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Power Distribution (PDU)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Management Server</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span className="text-sm">Empty Units</span>
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-md font-semibold mb-4">Configuration Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div><strong>Model:</strong> {chassisModel}</div>
              <div><strong>Form Factor:</strong> {formFactor}</div>
              <div><strong>Drives/Server:</strong> {drivesPerServer}</div>
              <div><strong>Total Drives:</strong> {totalDrives}</div>
              <div><strong>Bandwidth:</strong> {totalBandwidthGBps.toFixed(1)} GB/s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackVisualization;