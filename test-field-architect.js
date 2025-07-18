// Quick test script to verify Field Architect rules
import { validateConfiguration, FIELD_ARCHITECT_RULES, getRecommendedNICSpeed } from './src/config/field-architect-best-practices.ts';

console.log('🧪 Testing MinIO Field Architect Best Practices Rules\n');

// Test 1: Configuration that meets all requirements
console.log('✅ Test 1: Compliant Configuration');
const compliantConfig = {
  usableCapacityTB: 500,
  servers: 8,
  drivesPerServer: 16,
  cpuCores: 96,
  memoryGB: 512,
  nicSpeedGbps: 100
};

const compliantResults = validateConfiguration(compliantConfig);
console.log(`Results: ${compliantResults.length} validation messages`);
compliantResults.forEach(result => {
  console.log(`  ${result.level.toUpperCase()}: ${result.message}`);
});

// Test 2: Configuration with violations
console.log('\n❌ Test 2: Non-Compliant Configuration');
const nonCompliantConfig = {
  usableCapacityTB: 100, // Below minimum
  servers: 2,           // Below minimum
  drivesPerServer: 2,   // Below minimum
  cpuCores: 32,         // Below minimum
  memoryGB: 128,        // Below minimum
  nicSpeedGbps: 10      // Below minimum
};

const nonCompliantResults = validateConfiguration(nonCompliantConfig);
console.log(`Results: ${nonCompliantResults.length} validation messages`);
nonCompliantResults.forEach(result => {
  console.log(`  ${result.level.toUpperCase()}: ${result.message}`);
});

// Test 3: Network recommendations
console.log('\n🌐 Test 3: Network Recommendations');
console.log(`For 500TB: ${getRecommendedNICSpeed(500)}Gbps`);
console.log(`For 2PB: ${getRecommendedNICSpeed(2000)}Gbps`);

// Display rules summary
console.log('\n📋 Field Architect Rules Summary:');
console.log(`Minimum Usable Capacity: ${FIELD_ARCHITECT_RULES.capacity.minimumUsableCapacityTB}TB`);
console.log(`Minimum Servers: ${FIELD_ARCHITECT_RULES.servers.minimumCount}`);
console.log(`Recommended Servers: ${FIELD_ARCHITECT_RULES.servers.recommendedCount}+`);
console.log(`Minimum Drives per Host: ${FIELD_ARCHITECT_RULES.drives.minimumPerHost}`);
console.log(`Recommended Drives per Host: ${FIELD_ARCHITECT_RULES.drives.recommendedPerHost}+`);
console.log(`Minimum CPU Cores: ${FIELD_ARCHITECT_RULES.cpu.minimumCores}`);
console.log(`Minimum Memory: ${FIELD_ARCHITECT_RULES.memory.minimumGB}GB`);
console.log(`Minimum NIC Speed: ${FIELD_ARCHITECT_RULES.networking.minimumSpeedGbps}Gbps`);

console.log('\n🎯 Field Architect integration complete!');