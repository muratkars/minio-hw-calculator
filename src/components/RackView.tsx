import React, { useRef, useEffect, useState } from 'react';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartConfiguration } from 'chart.js';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface RackViewProps {
  servers: number;
  chassisModel: string;
  formFactor: string;
  totalPowerW: number;
  totalBandwidthGBps: number;
  rackUnits: number;
}

interface RackDiagram {
  totalUnits: number;
  usedUnits: number;
  serverPositions: Array<{
    position: number;
    height: number;
    label: string;
    type: 'server' | 'switch' | 'pdu' | 'management';
  }>;
}

const RackView: React.FC<RackViewProps> = ({
  servers,
  chassisModel,
  formFactor,
  totalPowerW,
  totalBandwidthGBps,
  rackUnits
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const powerChartRef = useRef<HTMLCanvasElement>(null);
  const bandwidthChartRef = useRef<HTMLCanvasElement>(null);
  const [rackDiagram, setRackDiagram] = useState<RackDiagram | null>(null);

  useEffect(() => {
    generateRackDiagram();
  }, [servers, formFactor, rackUnits]);

  useEffect(() => {
    if (canvasRef.current && rackDiagram) {
      drawRackDiagram();
    }
  }, [rackDiagram]);

  useEffect(() => {
    if (powerChartRef.current) {
      drawPowerChart();
    }
  }, [totalPowerW]);

  useEffect(() => {
    if (bandwidthChartRef.current) {
      drawBandwidthChart();
    }
  }, [totalBandwidthGBps]);

  const generateRackDiagram = () => {
    const serverHeight = formFactor === '1U' ? 1 : 2;
    const switchHeight = 1;
    const pduHeight = 1;
    const managementHeight = 1;
    
    const serverPositions: RackDiagram['serverPositions'] = [];
    let currentPosition = 1;

    // Add servers
    for (let i = 0; i < servers; i++) {
      serverPositions.push({
        position: currentPosition,
        height: serverHeight,
        label: `${chassisModel} #${i + 1}`,
        type: 'server'
      });
      currentPosition += serverHeight;
    }

    // Add network switches (estimate 1 switch per 24 servers)
    const switchCount = Math.max(1, Math.ceil(servers / 24));
    for (let i = 0; i < switchCount; i++) {
      serverPositions.push({
        position: currentPosition,
        height: switchHeight,
        label: `Network Switch #${i + 1}`,
        type: 'switch'
      });
      currentPosition += switchHeight;
    }

    // Add PDUs
    const pduCount = Math.max(2, Math.ceil(totalPowerW / 15000)); // Assume 15kW per PDU
    for (let i = 0; i < pduCount; i++) {
      serverPositions.push({
        position: currentPosition,
        height: pduHeight,
        label: `PDU #${i + 1}`,
        type: 'pdu'
      });
      currentPosition += pduHeight;
    }

    // Add management server
    serverPositions.push({
      position: currentPosition,
      height: managementHeight,
      label: 'Management Server',
      type: 'management'
    });
    currentPosition += managementHeight;

    const totalUnits = Math.max(42, currentPosition); // Standard rack is 42U
    const usedUnits = currentPosition - 1;

    setRackDiagram({
      totalUnits,
      usedUnits,
      serverPositions
    });
  };

  const drawRackDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas || !rackDiagram) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 600;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Colors for different component types
    const colors = {
      server: '#3B82F6',
      switch: '#EF4444',
      pdu: '#F59E0B',
      management: '#10B981',
      empty: '#F3F4F6'
    };

    const rackWidth = 250;
    const rackHeight = 550;
    const unitHeight = rackHeight / rackDiagram.totalUnits;
    const margin = 25;

    // Draw rack frame
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, rackWidth, rackHeight);

    // Draw rack units
    for (let i = 0; i < rackDiagram.totalUnits; i++) {
      const y = margin + (i * unitHeight);
      
      // Find component at this position
      const component = rackDiagram.serverPositions.find(pos => 
        i + 1 >= pos.position && i + 1 < pos.position + pos.height
      );

      if (component) {
        // Draw component
        ctx.fillStyle = colors[component.type];
        ctx.fillRect(margin + 2, y + 1, rackWidth - 4, unitHeight * component.height - 2);
        
        // Draw component label (only on first unit of multi-unit components)
        if (i + 1 === component.position) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          const textY = y + (unitHeight * component.height / 2) + 3;
          ctx.fillText(component.label, margin + rackWidth / 2, textY);
        }
      } else {
        // Draw empty unit
        ctx.fillStyle = colors.empty;
        ctx.fillRect(margin + 2, y + 1, rackWidth - 4, unitHeight - 2);
      }

      // Draw unit separator
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + rackWidth, y);
      ctx.stroke();

      // Draw unit number
      ctx.fillStyle = '#6B7280';
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText((rackDiagram.totalUnits - i).toString(), margin - 20, y + unitHeight / 2 + 2);
    }

    // Draw title
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Rack Layout', canvas.width / 2, 15);
  };

  const drawPowerChart = () => {
    const canvas = powerChartRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const powerData = {
      labels: ['Servers', 'Storage', 'Network', 'Cooling'],
      datasets: [{
        label: 'Power Consumption (W)',
        data: [
          totalPowerW * 0.4, // Server overhead
          totalPowerW * 0.4, // Storage drives
          totalPowerW * 0.1, // Network equipment
          totalPowerW * 0.1  // Cooling overhead
        ],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#EF4444',
          '#F59E0B'
        ],
        borderWidth: 1
      }]
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: powerData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Power Distribution'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Power (W)'
            }
          }
        }
      }
    };

    new Chart(ctx, config);
  };

  const drawBandwidthChart = () => {
    const canvas = bandwidthChartRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    // Simulate bandwidth over time (example data)
    const timeLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const bandwidthData = timeLabels.map((_, i) => {
      // Simulate daily usage pattern
      const baseUsage = totalBandwidthGBps * 0.3; // 30% baseline
      const peakMultiplier = 1 + Math.sin((i - 6) * Math.PI / 12) * 0.6; // Peak during business hours
      return Math.max(0, baseUsage * peakMultiplier);
    });

    const data = {
      labels: timeLabels,
      datasets: [{
        label: 'Bandwidth Usage (GB/s)',
        data: bandwidthData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    const config: ChartConfiguration = {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '24-Hour Bandwidth Profile'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time of Day'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Bandwidth (GB/s)'
            }
          }
        }
      }
    };

    new Chart(ctx, config);
  };

  const calculateRackUtilization = () => {
    if (!rackDiagram) return 0;
    return Math.round((rackDiagram.usedUnits / rackDiagram.totalUnits) * 100);
  };

  const getComponentCounts = () => {
    if (!rackDiagram) return {};
    
    const counts: { [key: string]: number } = {};
    rackDiagram.serverPositions.forEach(pos => {
      counts[pos.type] = (counts[pos.type] || 0) + 1;
    });
    
    return counts;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Rack Visualization</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rack Diagram */}
          <div className="flex flex-col items-center">
            <canvas 
              ref={canvasRef}
              className="border border-gray-200 rounded"
              width={300}
              height={600}
            />
            
            {rackDiagram && (
              <div className="mt-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Rack Utilization:</span>
                  <span className="font-semibold">{calculateRackUtilization()}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Used Units:</span>
                  <span>{rackDiagram.usedUnits} / {rackDiagram.totalUnits}</span>
                </div>
              </div>
            )}
          </div>

          {/* Component Summary */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Component Summary</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(getComponentCounts()).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize">{type}s:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Servers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Network Switches</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Power Distribution</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <canvas
            ref={powerChartRef}
            className="w-full h-64"
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <canvas
            ref={bandwidthChartRef}
            className="w-full h-64"
          />
        </div>
      </div>
    </div>
  );
};

export default RackView;