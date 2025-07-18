import React from 'react';

interface ServerVisualProps {
  model: string;
  formFactor: '1U' | '2U';
  vendor: string;
  isHighlighted?: boolean;
}

export const ServerVisual: React.FC<ServerVisualProps> = ({ 
  model, 
  formFactor, 
  vendor, 
  isHighlighted = false 
}) => {
  const getServerStyle = () => {
    const baseStyle = "w-full h-full flex items-center justify-between px-2 text-white text-xs font-medium rounded shadow-sm";
    
    // Vendor-specific colors and styling
    const vendorStyles: { [key: string]: string } = {
      'Supermicro': 'bg-gradient-to-r from-blue-600 to-blue-700',
      'Dell': 'bg-gradient-to-r from-blue-800 to-blue-900', 
      'HPE': 'bg-gradient-to-r from-green-600 to-green-700',
      'Generic': 'bg-gradient-to-r from-gray-600 to-gray-700'
    };

    const vendorStyle = vendorStyles[vendor] || vendorStyles['Generic'];
    const highlightStyle = isHighlighted ? 'ring-2 ring-yellow-400' : '';
    
    return `${baseStyle} ${vendorStyle} ${highlightStyle}`;
  };

  const getFrontPanelElements = () => {
    // Create visual elements that represent a typical server front panel
    const elements = [];
    
    // Power LED
    elements.push(
      <div key="power" className="w-1 h-1 bg-green-400 rounded-full"></div>
    );
    
    // Status LEDs
    for (let i = 0; i < 3; i++) {
      elements.push(
        <div key={`led-${i}`} className="w-1 h-1 bg-blue-400 rounded-full"></div>
      );
    }

    return elements;
  };

  const getDriveSlots = () => {
    // Visual representation of drive slots
    const driveCount = model.includes('32') ? 32 : 
                     model.includes('24') ? 24 : 
                     model.includes('16') ? 16 : 
                     model.includes('12') ? 12 : 
                     model.includes('10') ? 10 : 8;
    
    const slots = [];
    const slotsToShow = Math.min(driveCount, formFactor === '1U' ? 8 : 12); // Visual limitation
    
    for (let i = 0; i < slotsToShow; i++) {
      slots.push(
        <div 
          key={`slot-${i}`} 
          className="w-0.5 h-2 bg-black bg-opacity-30 rounded-sm"
        ></div>
      );
    }
    
    return slots;
  };

  return (
    <div className={getServerStyle()}>
      {/* Left side - Model info */}
      <div className="flex items-center space-x-1">
        <div className="text-xs font-bold truncate max-w-16">
          {model.split('-')[0]}
        </div>
        <div className="flex space-x-0.5">
          {getFrontPanelElements()}
        </div>
      </div>

      {/* Center - Drive slots */}
      <div className="flex-1 flex items-center justify-center space-x-0.5 mx-2">
        {getDriveSlots()}
      </div>

      {/* Right side - Form factor indicator */}
      <div className="text-xs font-bold">
        {formFactor}
      </div>
    </div>
  );
};

interface NetworkSwitchVisualProps {
  label: string;
  portCount?: number;
}

export const NetworkSwitchVisual: React.FC<NetworkSwitchVisualProps> = ({ 
  label, 
  portCount = 48 
}) => {
  const getPorts = () => {
    const ports = [];
    const portsToShow = Math.min(portCount, 16); // Visual limitation
    
    for (let i = 0; i < portsToShow; i++) {
      ports.push(
        <div 
          key={`port-${i}`}
          className="w-1 h-1.5 bg-black bg-opacity-40 rounded-sm"
        ></div>
      );
    }
    
    return ports;
  };

  return (
    <div className="w-full h-full bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-medium rounded shadow-sm flex items-center justify-between px-2">
      <div className="flex items-center space-x-1">
        <span className="font-bold">🔀</span>
        <span className="truncate">{label}</span>
      </div>
      
      <div className="flex space-x-0.5">
        {getPorts()}
      </div>
      
      <div className="text-xs">
        {portCount}p
      </div>
    </div>
  );
};

interface PDUVisualProps {
  label: string;
  outletCount?: number;
}

export const PDUVisual: React.FC<PDUVisualProps> = ({ 
  label, 
  outletCount = 24 
}) => {
  const getOutlets = () => {
    const outlets = [];
    const outletsToShow = Math.min(outletCount, 12); // Visual limitation
    
    for (let i = 0; i < outletsToShow; i++) {
      outlets.push(
        <div 
          key={`outlet-${i}`}
          className="w-1 h-1.5 bg-black bg-opacity-40 rounded-sm"
        ></div>
      );
    }
    
    return outlets;
  };

  return (
    <div className="w-full h-full bg-gradient-to-r from-yellow-600 to-yellow-700 text-white text-xs font-medium rounded shadow-sm flex items-center justify-between px-2">
      <div className="flex items-center space-x-1">
        <span className="font-bold">⚡</span>
        <span className="truncate">{label}</span>
      </div>
      
      <div className="flex space-x-0.5">
        {getOutlets()}
      </div>
      
      <div className="text-xs">
        {outletCount}O
      </div>
    </div>
  );
};

interface ManagementServerVisualProps {
  label: string;
}

export const ManagementServerVisual: React.FC<ManagementServerVisualProps> = ({ 
  label 
}) => {
  return (
    <div className="w-full h-full bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-medium rounded shadow-sm flex items-center justify-between px-2">
      <div className="flex items-center space-x-1">
        <span className="font-bold">⚙️</span>
        <span className="truncate">{label}</span>
      </div>
      
      <div className="flex space-x-0.5">
        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
        <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
      </div>
      
      <div className="text-xs">
        MGMT
      </div>
    </div>
  );
};