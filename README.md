# MinIO Hardware Calculator

A web-based tool for calculating optimal hardware configurations for MinIO object storage deployments.

## Features

- Hardware Configuration: Select from Supermicro, Dell, and HPE server options
- Capacity Planning: Calculate raw and usable capacity with erasure coding
- Performance Estimates: Bandwidth, IOPS, and power consumption analysis
- Rack Visualization: Visual rack layout and space planning
- Cost Analysis: TCO calculations with depreciation and power costs
- PDF Export: Generate professional configuration reports

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ with pandas, openpyxl

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

3. Prepare hardware data
```bash
python scripts/convert_to_json.py
```

4. Start development server
```bash
npm run dev
```

5. Open in browser
Navigate to `http://localhost:5173`

## Example Configuration

For 1PB usable capacity with Supermicro servers:
- Servers: 8x Supermicro ASG-2115S-NE332R
- Storage: 32x 15.36TB NVMe drives per server
- Erasure Coding: EC 8:3 (72.7% efficiency)
- Raw Capacity: 1.38PB
- Performance: ~1.8TB/s aggregate bandwidth (TBV)

## Project Structure

```
/minio-hw-calculator
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── scripts/
│   ├── convert_to_json.py
│   ├── validate_data.py
│   └── requirements.txt
├── data/
│   ├── hardware_specs.json
│   ├── chassis.csv
│   ├── cpus.csv
│   ├── memory.csv
│   ├── storage_drives.csv
│   └── boot_drives.csv
├── public/
│   ├── index.html
│   └── data/
│       └── hardware_specs.json
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Form.tsx
│   │   └── RackView.tsx
│   ├── utils/
│   │   ├── calculations.ts
│   │   └── dataLoader.ts
│   └── types/
│       └── hardware.ts
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test            # Run tests
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint        # Lint code
npm run lint:fix    # Fix linting issues
npm run format      # Format code with Prettier

# Data Management
npm run prepare-data # Convert Excel to JSON
npm run validate-data # Validate data integrity
```

### Data Management

Hardware specifications are stored in CSV files and converted to JSON:

```bash
# Convert Excel to CSV files and then to JSON
python scripts/convert_to_json.py

# Validate data integrity
python scripts/validate_data.py

# Generate sample data
python scripts/generate_sample_data.py
```

### CSV File Structure

#### chassis.csv
Contains server chassis specifications:
- Vendor, Model, Form Factor
- Drive bays and types
- CPU sockets, Memory slots
- Size category (small/medium/large)
- Power supply specifications

#### storage_drives.csv
Contains NVMe drive specifications:
- Vendor, Model, Capacity
- Performance metrics (IOPS, bandwidth)
- Power consumption
- Form factor and interface

#### cpus.csv
Contains CPU specifications:
- Vendor, Model, Core count
- Clock speeds, TDP
- Memory channels and bandwidth
- PCIe lanes

## Erasure Coding

The calculator supports multiple erasure coding schemes:

- EC 8:2 - 80% efficiency, 2 drive fault tolerance
- EC 8:3 - 72.7% efficiency, 3 drive fault tolerance (default)
- EC 8:4 - 66.7% efficiency, 4 drive fault tolerance

## Size Categories

- Small: 1U servers with 8-16 drive bays
- Medium: 1U servers with 16-24 drive bays
- Large: 2U servers with 24-32+ drive bays

## API Reference

### Configuration Object

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
  aggregateBandwidthGBps: number;
  totalIOPS: number;
  powerConsumptionW: number;
  powerConsumptionKWhPerMonth: number;
  thermalBTUPerHour: number;
}
```

## Deployment

### Docker

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

# Serve static files
npm run preview
```

### Environment Variables

Create a `.env` file for configuration:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=true
VITE_VERSION=1.0.0
```

## Hardware Vendors Supported

### Supermicro
- ASG-2115S-NE332R (2U, 32 drives)
- ASG-1115S-NE316R (1U, 16 drives)

### Dell
- PowerEdge R7615 (1U, 12 drives)
- PowerEdge R7715 (2U, 24 drives)

### HPE
- ProLiant DL325 Gen11 (1U, 10 drives)
- ProLiant DL345 Gen11 (1U, 24 drives)

## Storage Drives Supported

### Solidigm D5-P5336
- 30.72TB, 15.36TB, 7.68TB capacities
- NVMe Gen4, E3.S form factor
- Up to 7000 MB/s sequential read

### Seagate Nytro 5360H
- 30.72TB, 15.36TB capacities
- TLC 3D NAND technology
- Enterprise grade reliability

### Micron 9550 PRO
- 30.72TB, 15.36TB capacities
- 176-layer TLC NAND
- High performance and efficiency

## Calculations

### Capacity Calculation

```
Raw Capacity = Usable Capacity / Erasure Coding Efficiency
Server Count = ceil(Raw Capacity / (Drives per Server × Drive Capacity))
```

### Performance Calculation

```
Aggregate Bandwidth = Total Drives × Drive Sequential Read Speed
Total IOPS = Total Drives × Drive Random Read IOPS
Power Consumption = (Total Drives × Drive Power) + (Servers × Server Overhead)
```

### Cost Analysis

```
Annual Depreciation = Purchase Price / 5 years
Monthly Power Cost = Monthly kWh × Electricity Rate
5-Year TCO = Purchase Price + (Monthly Power Cost × 60 months)
```

## Troubleshooting

### Common Issues

1. **Data not loading**
   - Ensure `hardware_specs.json` exists in `public/data/`
   - Run `python scripts/convert_to_json.py` to generate JSON

2. **Build failures**
   - Check Node.js version (requires 18+)
   - Clear npm cache: `npm cache clean --force`
   - Remove node_modules and reinstall: `rm -rf node_modules && npm install`

3. **Python script errors**
   - Install required packages: `pip install -r scripts/requirements.txt`
   - Ensure Excel file exists in project root

### Performance Issues

- Use production build for better performance
- Enable gzip compression on web server
- Consider CDN for static assets

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run linting and tests: `npm run lint && npm test`
5. Commit changes: `git commit -m "Add feature"`
6. Push to branch: `git push origin feature-name`
7. Create Pull Request

### Development Guidelines

- Use TypeScript for type safety
- Follow ESLint configuration
- Add tests for new features
- Update documentation
- Use conventional commit messages

## Testing

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

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: Check the `docs/` directory
- Issues: [GitHub Issues](https://github.com/muratkars/minio-hw-calculator/issues)
- Discussions: [GitHub Discussions](https://github.com/muratkars/minio-hw-calculator/discussions)

## Changelog

### Version 1.0.0
- Initial release
- Basic hardware configuration
- Rack visualization
- Cost analysis
- Export functionality

## Roadmap

- [ ] Backend API integration
- [ ] Advanced performance modeling
- [ ] Multi-site configurations
- [ ] Custom hardware profiles
- [ ] Integration with MinIO deployment tools
- [ ] Real-time pricing updates
- [ ] Configuration templates
- [ ] Comparative analysis tools

## Acknowledgments

- MinIO team for object storage expertise
- Hardware vendors for specifications
- Open source community for tools and libraries

---

For more information, visit the [project documentation](docs/) or contact the development team.