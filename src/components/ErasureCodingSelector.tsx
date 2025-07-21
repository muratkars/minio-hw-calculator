/**
 * Erasure Coding Selector Component
 * Advanced dropdown with visual indicators for MinIO erasure coding options
 */

import React, { useState, useEffect } from 'react';
import { ErasureCodeOption, loadErasureCodingOptions, convertToScheme, validateDriveCount, getDetailedECInfo } from '../utils/erasureCodingLoader';
import { ErasureCodingScheme } from '../utils/calculations';

interface ErasureCodingSelectorProps {
  selectedScheme: string;
  totalDrives?: number;
  onSchemeChange: (scheme: ErasureCodingScheme) => void;
  onValidationChange?: (validation: { valid: boolean; warnings: string[]; errors: string[] }) => void;
  allowManualOverride?: boolean;
  showDetails?: boolean;
  className?: string;
}

const ErasureCodingSelector: React.FC<ErasureCodingSelectorProps> = ({
  selectedScheme,
  totalDrives = 0,
  onSchemeChange,
  onValidationChange,
  allowManualOverride = false,
  showDetails = true,
  className = ""
}) => {
  const [ecOptions, setEcOptions] = useState<ErasureCodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showECDetails, setShowECDetails] = useState(false);
  const [manualParity, setManualParity] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<ErasureCodeOption | null>(null);

  // Load erasure coding options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await loadErasureCodingOptions();
        setEcOptions(options);
        
        // Set initial selected option
        const initial = options.find(opt => opt.scheme_name === selectedScheme) || options[0];
        if (initial) {
          setSelectedOption(initial);
        }
      } catch (error) {
        console.error('Failed to load erasure coding options:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOptions();
  }, [selectedScheme]);

  // Update validation when selection changes
  useEffect(() => {
    if (totalDrives > 0 && onValidationChange) {
      const validation = validateDriveCount(totalDrives, selectedOption || undefined, manualParity || undefined);
      onValidationChange(validation);
    }
  }, [selectedOption, totalDrives, onValidationChange, manualParity]);

  // Handle scheme selection
  const handleSchemeSelection = (option: ErasureCodeOption) => {
    setSelectedOption(option);
    onSchemeChange(convertToScheme(option));
  };

  // Handle manual parity override
  const handleManualParityChange = (newParity: number) => {
    if (!selectedOption) return;
    
    // Use the correct EC notation: ECK:M where K=total_shards, M=parity_shards
    const totalShards = selectedOption.total_shards;
    const dataShards = totalShards - newParity;
    
    const customOption: ErasureCodeOption = {
      ...selectedOption,
      scheme_name: `EC${totalShards}:${newParity}`,
      data_shards: dataShards,
      parity_shards: newParity,
      total_shards: totalShards,
      storage_efficiency: dataShards / totalShards,
      fault_tolerance: newParity,
      min_drives: totalShards,
      recommended: false,
      description: `Custom EC${totalShards}:${newParity} configuration`
    };
    
    setManualParity(newParity);
    handleSchemeSelection(customOption);
  };

  // Get efficiency color class
  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 0.8) return 'text-green-600';
    if (efficiency >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get fault tolerance color class
  const getFaultToleranceColor = (tolerance: number): string => {
    if (tolerance >= 4) return 'text-green-600';
    if (tolerance >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  const recommendedOptions = ecOptions.filter(opt => opt.recommended);
  const otherOptions = ecOptions.filter(opt => !opt.recommended);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Erasure Coding Scheme
          {totalDrives > 0 && (
            <span className="ml-2 text-xs text-gray-500">
              ({totalDrives} drives available)
            </span>
          )}
        </label>
        
        <select
          value={selectedOption?.scheme_name || ''}
          onChange={(e) => {
            const option = ecOptions.find(opt => opt.scheme_name === e.target.value);
            if (option) {
              handleSchemeSelection(option);
              setManualParity(null); // Reset manual override
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Recommended Options */}
          {recommendedOptions.length > 0 && (
            <optgroup label="🌟 Recommended">
              {recommendedOptions.map(option => (
                <option key={option.scheme_name} value={option.scheme_name}>
                  {option.scheme_name} - {Math.round(option.storage_efficiency * 100)}% efficiency
                  {totalDrives > 0 && totalDrives < option.min_drives && ' (Insufficient drives)'}
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Other Options */}
          {otherOptions.length > 0 && (
            <optgroup label="Other Options">
              {otherOptions.map(option => (
                <option key={option.scheme_name} value={option.scheme_name}>
                  {option.scheme_name} - {Math.round(option.storage_efficiency * 100)}% efficiency
                  {totalDrives > 0 && totalDrives < option.min_drives && ' (Insufficient drives)'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Collapsible EC Details */}
      {showDetails && selectedOption && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowECDetails(!showECDetails)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 py-2 px-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
          >
            <span>EC Details</span>
            <span className={`transform transition-transform ${showECDetails ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showECDetails && (
            <div className="mt-2 bg-gray-50 p-4 rounded-lg space-y-3 border">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{selectedOption.scheme_name}</span>
                {selectedOption.recommended && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ⭐ Recommended
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600">{selectedOption.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Storage Efficiency:</span>
                    <span className={`font-semibold ${getEfficiencyColor(selectedOption.storage_efficiency)}`}>
                      {Math.round(selectedOption.storage_efficiency * 100)}%
                    </span>
                    <div className="relative group">
                      <button 
                        type="button"
                        className="w-4 h-4 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200"
                      >
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        <strong>Storage Efficiency:</strong> The percentage of raw storage capacity available for data storage after accounting for erasure coding parity.
                        <br/><br/>
                        <strong>Calculation:</strong> Data Shards / Total Shards = {selectedOption.data_shards}/{selectedOption.total_shards} = {Math.round(selectedOption.storage_efficiency * 100)}%
                        <br/><br/>
                        For EC{selectedOption.total_shards}:{selectedOption.parity_shards}, MinIO uses {selectedOption.data_shards} data shards and {selectedOption.parity_shards} parity shards across {selectedOption.total_shards} total drives in the erasure set.
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Min Drives:</span>
                  <span className="ml-2">{selectedOption.min_drives}</span>
                </div>
              </div>

              {/* Fault Tolerance Section */}
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium text-gray-900 mb-3">Fault Tolerance</h4>
                
                {/* Drive Fault Tolerance */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">Drive Failures:</span>
                    <span className={`font-semibold ${getFaultToleranceColor(selectedOption.fault_tolerance)}`}>
                      {selectedOption.fault_tolerance} drives
                    </span>
                    <div className="relative group">
                      <button 
                        type="button"
                        className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center hover:bg-blue-200"
                      >
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        <strong>Drive Failure Tolerance:</strong> The number of drives the MinIO deployment can lose while still performing read + write operations (read + write quorum). Quorum is per-stripe, where the aggregated total assumes no more than {Math.floor(selectedOption.fault_tolerance)} failed drive(s) per stripe.
                        <br/><br/>
                        {selectedOption.parity_shards >= selectedOption.total_shards / 2 ? (
                          <>If the Erasure Code Parity (M={selectedOption.parity_shards}) is 1/2 the Stripe Size, read + write quorum is ({selectedOption.total_shards} - ({selectedOption.parity_shards} + 1)) = {selectedOption.total_shards - selectedOption.parity_shards - 1} drives.</>
                        ) : (
                          <>With Parity (M={selectedOption.parity_shards}) less than 1/2 the Stripe Size ({selectedOption.total_shards}), the deployment can tolerate {selectedOption.parity_shards} drive failures while maintaining quorum.</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Server Fault Tolerance */}
                {totalDrives > 0 && (() => {
                  const serversInUse = Math.ceil(totalDrives / selectedOption.total_shards);
                  const serverTolerance = Math.floor(selectedOption.parity_shards / Math.ceil(selectedOption.total_shards / serversInUse));
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Server Failures:</span>
                        <span className={`font-semibold ${getFaultToleranceColor(serverTolerance)}`}>
                          {serverTolerance} server{serverTolerance !== 1 ? 's' : ''}
                        </span>
                        <div className="relative group">
                          <button 
                            type="button"
                            className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center hover:bg-blue-200"
                          >
                            ?
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            <strong>Server Failure Tolerance:</strong> The number of servers the MinIO deployment can lose while still performing read + write operations (read + write quorum). Quorum is per-stripe, where each drive on the server supports one of the Erasure Code stripes. Based on the parity setting M={selectedOption.parity_shards}, the loss of more than {serverTolerance} server(s) would exceed the read+write quorum of {selectedOption.parity_shards} drive(s) offline.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MinIO Erasure Set Details */}
              {totalDrives > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="text-sm">
                    <span className="font-medium">MinIO Erasure Set Analysis:</span>
                    {(() => {
                      const details = getDetailedECInfo(totalDrives, manualParity || undefined);
                      return (
                        <div className="mt-1 text-gray-600 space-y-1">
                          <div>Erasure Sets: {details.sets.length} set(s)</div>
                          <div>Usable Drives: {details.totalUsableDrives}/{totalDrives}</div>
                          {details.unusedDrives > 0 && (
                            <div className="text-orange-600">Unused Drives: {details.unusedDrives} (need ≥4 for a set)</div>
                          )}
                          <div>Overall Efficiency: {Math.round(details.overallEfficiency * 100)}%</div>
                          <div>Stripe Size: {details.stripeSize} MiB</div>
                          <div>Multipart Size: {details.multipartPartSize} MiB</div>
                          {details.sets.length > 1 && (
                            <div className="text-blue-600">
                              Set Details: {details.sets.map(set => `${set.drives}d (${set.dataShards}+${set.parityShards})`).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              {/* Manual Parity Override */}
              {allowManualOverride && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 py-1"
                    >
                      <span>Manual Parity Override</span>
                      <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    <div className="relative group">
                      <button 
                        type="button"
                        className="w-4 h-4 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200"
                      >
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        <strong>Manual Parity Override:</strong> Override the recommended parity setting for this erasure coding scheme. Manual override may not follow MinIO best practices. MinIO recommends 2 parity for 4-8 drives, 4 parity for 10-16 drives.
                        <br/><br/>
                        <strong>Efficiency Formula:</strong> (Total Shards - Parity) / Total Shards
                        <br/>
                        For EC{selectedOption.total_shards}:M, efficiency = ({selectedOption.total_shards} - M) / {selectedOption.total_shards}
                      </div>
                    </div>
                  </div>
                  
                  {showAdvanced && (
                    <div className="mt-2 p-3 bg-yellow-50 rounded-md">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Parity Shards (Current: {selectedOption.parity_shards})
                        </label>
                        <select
                          value={manualParity || selectedOption.parity_shards}
                          onChange={(e) => handleManualParityChange(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          {Array.from({ length: Math.max(6, Math.floor(selectedOption.total_shards / 2)) }, (_, i) => i + 1).map(parity => {
                            const efficiency = (selectedOption.total_shards - parity) / selectedOption.total_shards;
                            return (
                              <option key={parity} value={parity}>
                                {parity} parity ({Math.round(efficiency * 100)}% efficiency, {parity} drive tolerance)
                              </option>
                            );
                          })}
                        </select>
                        {totalDrives > 0 && (() => {
                          const details = getDetailedECInfo(totalDrives, manualParity || undefined);
                          return (
                            <div className="mt-2 text-xs text-gray-600">
                              With {totalDrives} drives: {details.sets.length} sets, {details.unusedDrives} unused, {Math.round(details.overallEfficiency * 100)}% efficiency
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MinIO Auto-recommendation */}
              {totalDrives > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="text-sm">
                    {(() => {
                      const details = getDetailedECInfo(totalDrives);
                      if (details.sets.length > 0) {
                        return (
                          <div className="bg-blue-50 p-3 rounded text-blue-700">
                            <div className="font-medium mb-1">💡 MinIO Configuration Preview</div>
                            <div className="text-sm">
                              MinIO will create {details.sets.length} erasure set(s) with {totalDrives} drives
                            </div>
                            <div className="text-xs mt-1 text-blue-600">
                              {details.totalUsableDrives} usable drives, {Math.round(details.overallEfficiency * 100)}% efficiency
                              {details.unusedDrives > 0 && `, ${details.unusedDrives} unused`}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErasureCodingSelector;