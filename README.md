# LAS Viewer

A simple web-based viewer for well log LAS (Log ASCII Standard) files, commonly used in the oil & gas and geothermal industries.

## Features

- Upload and parse LAS files
- Visualize well log curves
- Toggle between single-track and multi-track visualization
- Select which curves to display
- View basic well metadata

## Supported LAS Formats

This viewer supports:
- Standard LAS format (space/tab delimited)
- Pipe-delimited format (common in some systems)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/las-viewer.git
cd las-viewer
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a LAS file by dragging and dropping it into the designated area or by clicking to select a file.
2. Alternatively, click "load the sample file" to use the included example file.
3. Use the curve selector to choose which curves to display.
4. Switch between single-track view (all curves on one plot) and multi-track view (each curve in its own track).

## Building for Production

```bash
npm run build
# or
yarn build
```

This will create optimized production files in the `dist` directory.

## License

MIT

## Acknowledgments

- The [LAS file format](https://www.cwls.org/products/#products-las) is maintained by the Canadian Well Logging Society (CWLS).
- This viewer uses [D3.js](https://d3js.org/) for data visualization. 