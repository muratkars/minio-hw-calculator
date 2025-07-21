# MinIO Hardware Calculator

A comprehensive web-based tool for calculating optimal hardware configurations for MinIO object storage deployments. Features advanced erasure coding calculations, real-time capacity formatting, and Field Architect best practices validation.

## ✨ Key Features

### Core Functionality
- **Smart Hardware Configuration**: T-shirt sized server configurations from Supermicro, Dell, and HPE
- **Advanced Erasure Coding**: Accurate EC calculations with MinIO's public calculator alignment
- **Intelligent Capacity Planning**: Auto-converts TB/PB for better readability
- **Performance Analytics**: Bandwidth (GB/s ↔ TB/s), IOPS, and power consumption analysis
- **Field Architect Validation**: Built-in MinIO best practices compliance checking
- **Professional Export**: Generate configuration reports and quotes

### UI/UX Improvements
- **Collapsible EC Details**: Clean interface with expandable erasure coding information
- **Real-time Updates**: Capacity and efficiency updates instantly when EC schemes change
- **Smart Formatting**: Automatic unit conversion (TB/PB, GB/s/TB/s) for large numbers
- **Interactive Tooltips**: Hover for detailed explanations and formulas
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### Advanced Erasure Coding
- **Correct EC Notation**: ECK:M format (e.g., EC8:3 = 8 total drives, 3 parity)
- **Accurate Efficiency**: EC8:3 = 62.5%, EC12:4 = 66.7% (matches MinIO calculator)
- **Drive/Server Fault Tolerance**: Detailed failure tolerance calculations with quorum explanations
- **Manual Override**: Advanced users can customize parity settings with warnings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ with pandas, openpyxl (for data conversion)

### Installation

1. Clone the repository
```bash
git clone https://github.com/muratkars/minio-hw-calculator.git
cd minio-hw-calculator
```

2. Install dependencies
```bash
npm install
pip install -r scripts/requirements.txt
```

3. Prepare hardware data (convert CSV to JSON)
```bash
python scripts/convert_to_json.py
# Alternative: npm run prepare-data
```

4. Start development server
```bash
npm run dev
```

5. Open in browser
Navigate to `http://localhost:5173`

## 📊 Example Configuration

For 1PB usable capacity with recommended settings:
- **Servers**: 4x Supermicro ASG-2115S-NE332R (2U)
- **Storage**: 32x 15.36TB NVMe drives per server 
- **Erasure Coding**: EC8:3 (62.5% efficiency)
- **Raw Capacity**: 1.60 PB
- **Performance**: ~1.8 TB/s aggregate bandwidth
- **Fault Tolerance**: 3 drive failures, 1 server failure

## 🏗️ Project Structure

```
/minio-hw-calculator
├── README.md
├── CLAUDE.md                    # AI assistant instructions
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── scripts/
│   ├── convert_to_json.py       # CSV to JSON converter
│   ├── validate_data.py         # Data integrity validation
│   └── requirements.txt
├── data/                        # Source CSV files
│   ├── chassis.csv
│   ├── cpus.csv
│   ├── memory.csv
│   ├── storage_drives.csv
│   ├── boot_drives.csv
│   └── ec_options.csv           # Erasure coding schemes
├── public/
│   ├── index.html
│   └── data/
│       └── hardware_specs.json  # Generated hardware data
├── src/
│   ├── App.tsx                  # Main application
│   ├── components/
│   │   ├── Form.tsx             # Configuration form
│   │   ├── ErasureCodingSelector.tsx  # Advanced EC selector
│   │   ├── RackVisualization.tsx      # Rack layout tool
│   │   └── FieldArchitectRecommendations.tsx
│   ├── utils/
│   │   ├── calculations.ts      # Core calculation engine
│   │   ├── dataLoader.ts        # Hardware data loading
│   │   └── erasureCodingLoader.ts     # EC scheme management
│   ├── config/
│   │   └── field-architect-best-practices.ts  # MinIO best practices
│   └── types/
│       └── hardware.ts          # TypeScript interfaces
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build

# Testing and Quality
npm test             # Run tests
npm run test:coverage # Run tests with coverage
npm run test:watch   # Watch mode testing
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier

# Data Management
npm run prepare-data # Convert CSV to JSON
```

### Data Management Workflow

1. Update CSV files in `data/` directory
2. Run `python scripts/convert_to_json.py` to generate JSON
3. Validate with `python scripts/validate_data.py`
4. JSON files are automatically loaded by React components

### Development Commands from CLAUDE.md

```bash
# Setup and Development
npm install
pip install -r scripts/requirements.txt
python scripts/convert_to_json.py
npm run dev

# Testing and Quality
npm test
npm run test:coverage
npm run lint
npm run lint:fix
npm run format

# Docker Deployment
docker build -t minio-hw-calculator .
docker run -p 3000:80 minio-hw-calculator
docker-compose up -d
```

## 📈 Advanced Features

### Erasure Coding Engine

The calculator now uses MinIO's accurate erasure coding calculations:

```typescript
// Correct EC notation: ECK:M where K=total_shards, M=parity_shards
EC8:3  → 5 data + 3 parity = 8 total → 5/8 = 62.5% efficiency
EC12:4 → 8 data + 4 parity = 12 total → 8/12 = 66.7% efficiency
```

**Supported Schemes:**
- EC4:2 - 50.0% efficiency, 2 drive fault tolerance
- EC6:2 - 66.7% efficiency, 2 drive fault tolerance  
- EC8:2 - 75.0% efficiency, 2 drive fault tolerance
- EC8:3 - 62.5% efficiency, 3 drive fault tolerance (recommended)
- EC8:4 - 50.0% efficiency, 4 drive fault tolerance
- EC10:2 - 80.0% efficiency, 2 drive fault tolerance
- EC10:4 - 60.0% efficiency, 4 drive fault tolerance
- EC12:2 - 83.3% efficiency, 2 drive fault tolerance
- EC12:4 - 66.7% efficiency, 4 drive fault tolerance (recommended)
- EC14:2 - 85.7% efficiency, 2 drive fault tolerance
- EC14:4 - 71.4% efficiency, 4 drive fault tolerance
- EC16:4 - 75.0% efficiency, 4 drive fault tolerance

### Smart Unit Conversion

Automatic formatting for better readability:

**Capacity Formatting:**
- < 1000 TB: "500.00 TB"
- ≥ 1000 TB: "5.00 PB"

**Bandwidth Formatting:**
- < 1000 GB/s: "500.0 GB/s"  
- ≥ 1000 GB/s: "1.50 TB/s"

### Field Architect Best Practices

Built-in validation against MinIO's official recommendations:

- **Minimum**: 4 servers for high availability
- **Recommended**: 8+ servers for optimal performance
- **CPU**: 92+ cores per server
- **Memory**: 256GB+ RAM per server
- **Networking**: Auto-calculated based on capacity (100Gbps for <1PB, 400Gbps for 1PB+)
- **Capacity**: 400TB+ usable for production deployments

## 🖥️ Hardware Support

### Server Chassis

**Multi-vendor Support:**
- Dell, HPE, Supermicro

### Size Categories

- **Small**: 1U servers with 8-16 drive bays
- **Medium**: 1U servers with 16-24 drive bays  
- **Large**: 2U servers with 24-32+ drive bays

## 📋 API Reference

### Configuration Result

```typescript
interface ConfigurationResult {
  servers: number;
  chassisModel: string;
  drivesPerServer: number;
  totalDrives: number;
  rawCapacityTB: number;
  usableCapacityTB: number;
  efficiency: number;
  rackUnits: number;
  performance: PerformanceMetrics;
  costAnalysis?: CostAnalysis;
}
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  aggregateBandwidthGBps: number;  // Auto-formatted with formatBandwidth()
  totalIOPS: number;
  powerConsumptionW: number;
  powerConsumptionKWhPerMonth: number;
  thermalBTUPerHour: number;
}
```

### Erasure Coding Scheme

```typescript
interface ErasureCodingScheme {
  scheme_name: string;           // e.g., "EC8:3"
  data_shards: number;          // Data drives in set
  parity_shards: number;        // Parity drives in set  
  total_shards: number;         // Total drives in set
  storage_efficiency: number;   // Real efficiency (data/total)
  fault_tolerance: number;      // Max failed drives
  min_drives: number;          // Minimum drives required
  recommended: boolean;        // MinIO recommended scheme
}
```

## 🐛 Known Bugs and Issues

### Current Limitations

1. **Rack Visualization Tool**
   - ❌ Visual rack layout occasionally shows incorrect component placement
   - ❌ Rack space calculations may not account for cable management
   - ❌ Switch and PDU positioning needs refinement

2. **Hardware Components**
   - ❌ CPU models list incomplete - missing latest AMD EPYC and Intel Xeon processors
   - ❌ Memory configurations limited - DDR5 options not fully listed
   - ❌ NIC models incomplete - missing latest 100GbE and 400GbE options
   - ❌ Boot drive options limited to basic configurations

3. **Export Configuration**
   - ❌ PDF export feature not fully implemented
   - ❌ Custom branding and logo insertion missing
   - ❌ Advanced formatting options unavailable
   - ❌ Cost breakdown details incomplete in exports

4. **Configuration Management**
   - ❌ Save/Load configuration functionality incomplete
   - ❌ Configuration cannot be persisted across browser sessions
   - ❌ No configuration versioning or comparison
   - ❌ Import/Export of configuration files not working

5. **Advanced Features**
   - ❌ Multi-site deployments not supported
   - ❌ Custom erasure coding schemes cannot be saved
   - ❌ Performance modeling for mixed workloads incomplete
   - ❌ Real-time pricing integration missing

### Workarounds

- **Rack Visualization**: Use the capacity and server count from the main configuration
- **Missing Hardware**: Manually enter specifications in Advanced Options
- **Export Issues**: Use browser print functionality for basic reports
- **Save Configuration**: Bookmark URLs with configuration parameters

### Planned Fixes

- [ ] Complete rack visualization component overhaul
- [ ] Expand hardware database with latest components
- [ ] Implement proper PDF export with professional formatting
- [ ] Add configuration persistence with local storage/database
- [ ] Integrate real-time pricing APIs

## 🧮 Calculation Details

### Capacity Calculations

```
Raw Capacity = Usable Capacity / Storage Efficiency
Server Count = ceil(Raw Capacity / (Drives per Server × Drive Capacity))
```

**Example for 1PB usable with EC8:3:**
```
Raw Capacity = 1000TB / 0.625 = 1600TB
Server Count = ceil(1600TB / (32 drives × 15.36TB)) = 4 servers
```

### Performance Calculations

```
Aggregate Bandwidth = Total Drives × Drive Sequential Read Speed
Total IOPS = Total Drives × Drive Random Read IOPS  
Power Consumption = (Total Drives × Drive Power) + (Servers × Server Overhead)
```

### Cost Analysis (5-Year TCO)

```
Annual Depreciation = Purchase Price / 5 years
Monthly Power Cost = Monthly kWh × Electricity Rate ($0.12/kWh default)
5-Year TCO = Purchase Price + (Monthly Power Cost × 60 months)
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t minio-hw-calculator .

# Run container  
docker run -p 3000:80 minio-hw-calculator

# Using docker-compose
docker-compose up -d
```

### Production Build

```bash
# Build for production
npm run build

# Output: dist/ directory with optimized files
# - CSS: ~25KB (gzipped: ~5KB)
# - JS: ~229KB (gzipped: ~65KB)
# - Build time: ~650ms
```

### Environment Configuration

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=true
VITE_VERSION=1.0.0
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage  
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test Form.test.tsx
```

## 🔧 Troubleshooting

### Common Issues

1. **Data not loading**
   - Ensure `hardware_specs.json` exists in `public/data/`
   - Run `python scripts/convert_to_json.py` to generate JSON
   - Check browser console for loading errors

2. **Build failures**
   - Check Node.js version (requires 18+)  
   - Clear npm cache: `npm cache clean --force`
   - Remove node_modules: `rm -rf node_modules && npm install`

3. **Python script errors**
   - Install dependencies: `pip install -r scripts/requirements.txt`
   - Use virtual environment for Python dependencies
   - Check pandas and openpyxl versions

4. **Efficiency calculations wrong**
   - Verify CSV data uses correct EC notation
   - Check `data/ec_options.csv` for proper efficiency values
   - Regenerate JSON with `python scripts/convert_to_json.py`

### Performance Optimization

- Use production build (`npm run build`) for better performance
- Enable gzip compression on web server
- Consider CDN for static assets
- Optimize images and reduce bundle size

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and add tests  
4. Run quality checks: `npm run lint && npm test`
5. Commit changes: `git commit -m "Add feature"`
6. Push to branch: `git push origin feature-name`
7. Create Pull Request

### Development Guidelines

- Use TypeScript for type safety
- Follow ESLint configuration  
- Add tests for new features
- Update documentation
- Use conventional commit messages
- Follow existing code patterns

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/muratkars/minio-hw-calculator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/muratkars/minio-hw-calculator/discussions)

## 📈 Changelog

### Version 1.2.0 (Current)
- ✅ Fixed erasure coding efficiency calculations (EC8:3 now 62.5%, EC12:4 now 66.7%)
- ✅ Added automatic capacity unit conversion (TB ↔ PB)
- ✅ Added automatic bandwidth unit conversion (GB/s ↔ TB/s) 
- ✅ Implemented collapsible EC Details section
- ✅ Added comprehensive tooltips with hover explanations
- ✅ Fixed usable capacity updates when EC scheme changes
- ✅ Enhanced Field Architect best practices validation
- ✅ Improved UI/UX with cleaner, more organized interface

### Version 1.1.0
- ✅ Added ErasureCodingSelector component
- ✅ Implemented Field Architect best practices  
- ✅ Added advanced erasure coding options
- ✅ Enhanced server configuration options

### Version 1.0.0
- ✅ Initial release
- ✅ Basic hardware configuration
- ✅ Rack visualization foundation
- ✅ Cost analysis framework
- ✅ Export functionality base

## 🗺️ Roadmap

### Near Term 
- [ ] Fix rack visualization component
- [ ] Complete hardware component database
- [ ] Implement proper configuration save/load
- [ ] Add professional PDF export

### Medium Term  
- [ ] Backend API integration
- [ ] Real-time pricing updates
- [ ] Configuration templates and presets
- [ ] Advanced performance modeling

### Long Term
- [ ] Multi-site deployment configurations
- [ ] Integration with MinIO deployment tools
- [ ] Comparative analysis tools
- [ ] Custom hardware profile creation
- [ ] Advanced analytics and reporting

## 🙏 Acknowledgments

- **MinIO FA team** for object storage expertise and Field Architect guidelines
- **Hardware vendors** (Supermicro, Dell, HPE) for detailed specifications
- **Open source community** for tools, libraries, and inspiration
- **Contributors** who helped improve calculations and user experience

---

**📧 Contact**: For technical questions or collaboration opportunities, please use GitHub Issues or Discussions.

**🔗 Links**: 
- Live Demo (Soon!)
- [Documentation](docs/) 
- [Contributing Guide](CONTRIBUTING.md)