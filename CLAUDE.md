# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MinIO Hardware Calculator - a web-based tool for calculating optimal hardware configurations for MinIO object storage deployments. The project is built with:

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Data Processing**: Python scripts for converting CSV/Excel data to JSON
- **Deployment**: Docker support included

## Common Development Commands

### Setup and Development
```bash
# Install dependencies
npm install
pip install -r scripts/requirements.txt

# Prepare hardware data (convert CSV to JSON)
python scripts/convert_to_json.py
# Alternative: npm run prepare-data

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing and Quality
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test Form.test.tsx

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Data Management
```bash
# Convert Excel to CSV files and then to JSON
python scripts/convert_to_json.py

# Validate data integrity
python scripts/validate_data.py

# Generate sample data
python scripts/generate_sample_data.py
```

### Docker Deployment
```bash
# Build image
docker build -t minio-hw-calculator .

# Run container
docker run -p 3000:80 minio-hw-calculator

# Using docker-compose
docker-compose up -d
```

## Architecture Overview

### Key Components
- **Form.tsx**: Main configuration form for hardware selection
- **RackView.tsx**: Visual rack layout and space planning component
- **calculations.ts**: Core calculation logic for capacity, performance, and cost analysis
- **dataLoader.ts**: Handles loading and processing of hardware specifications
- **hardware.ts**: TypeScript type definitions for hardware specifications

### Data Flow
1. Hardware specifications stored in CSV files (`data/` directory)
2. Python scripts convert CSV to JSON format (`public/data/hardware_specs.json`)
3. React components load JSON data via dataLoader utility
4. User selections processed through calculations utility
5. Results displayed in form and rack visualization

### Key Calculations
- **Capacity**: Raw Capacity = Usable Capacity / Erasure Coding Efficiency
- **Performance**: Aggregate Bandwidth = Total Drives × Drive Sequential Read Speed
- **Cost**: 5-Year TCO = Purchase Price + (Monthly Power Cost × 60 months)

### Erasure Coding Schemes
- EC 8:2 (80% efficiency, 2 drive fault tolerance)
- EC 8:3 (72.7% efficiency, 3 drive fault tolerance) - default
- EC 8:4 (66.7% efficiency, 4 drive fault tolerance)

## Data Structure

### CSV Files Structure
- `chassis.csv`: Server specifications (vendors, models, drive bays, CPU sockets)
- `storage_drives.csv`: NVMe drive specs (capacity, performance, power consumption)
- `cpus.csv`: CPU specifications (core count, clock speeds, TDP)
- `memory.csv`: Memory specifications
- `boot_drives.csv`: Boot drive specifications

### Supported Hardware Vendors
- **Supermicro**: ASG-2115S-NE332R (2U, 32 drives), ASG-1115S-NE316R (1U, 16 drives)
- **Dell**: PowerEdge R7615 (1U, 12 drives), PowerEdge R7715 (2U, 24 drives)
- **HPE**: ProLiant DL325 Gen11 (1U, 10 drives), ProLiant DL345 Gen11 (1U, 24 drives)

### Size Categories
- **Small**: 1U servers with 8-16 drive bays
- **Medium**: 1U servers with 16-24 drive bays
- **Large**: 2U servers with 24-32+ drive bays

## Development Notes

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ with pandas, openpyxl

### Environment Configuration
Create `.env` file for configuration:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=true
VITE_VERSION=1.0.0
```

### Data Processing Workflow
1. Update CSV files in `data/` directory
2. Run `python scripts/convert_to_json.py` to generate JSON
3. Validate with `python scripts/validate_data.py`
4. JSON files are automatically loaded by React components

### Key TypeScript Interfaces
- `ConfigurationResult`: Complete configuration with servers, capacity, performance
- `PerformanceMetrics`: Bandwidth, IOPS, power consumption metrics
- `CostAnalysis`: TCO calculations with depreciation

## Troubleshooting

### Common Issues
1. **Data not loading**: Ensure `hardware_specs.json` exists in `public/data/`
2. **Build failures**: Check Node.js version (requires 18+), clear npm cache
3. **Python script errors**: Install required packages with `pip install -r scripts/requirements.txt`

### Performance Optimization
- Use production build for better performance
- Enable gzip compression on web server
- Consider CDN for static assets