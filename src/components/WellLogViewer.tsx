import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { LASFile } from '../types/LASTypes';

interface WellLogViewerProps {
  lasFile: LASFile;
}

// Define curve colors for visualization
const CURVE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const WellLogViewer: React.FC<WellLogViewerProps> = ({ lasFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCurves, setSelectedCurves] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<'single' | 'multi'>('single');
  const [logMetadata, setLogMetadata] = useState<{ [key: string]: any } | null>(null);

  // Setup initial selected curves
  useEffect(() => {
    if (lasFile?.curveNames?.length > 0) {
      // Select the first few curves by default (depth and up to 3 other curves)
      const initialCurves = lasFile.curveNames.slice(0, 4);
      setSelectedCurves(initialCurves);
      
      // Extract and format metadata
      const metadata: { [key: string]: any } = {};
      
      // Extract well info
      if (lasFile.header.well) {
        lasFile.header.well.sections.forEach(section => {
          metadata[section.mnemonic] = {
            value: section.value,
            unit: section.unit,
            description: section.description
          };
        });
      }
      
      setLogMetadata(metadata);
    }
  }, [lasFile]);

  // Render the well log visualization
  useEffect(() => {
    if (!containerRef.current || !lasFile || selectedCurves.length === 0) return;
    
    // Clear any existing visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Setup dimensions
    const margin = { top: 20, right: 50, bottom: 30, left: 60 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(500, lasFile.data.depth.length / 5) - margin.top - margin.bottom;
    
    // Create the SVG element
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get depth range
    const depthExtent = d3.extent(lasFile.data.depth) as [number, number];
    
    // Create depth scale (y-axis)
    const yScale = d3.scaleLinear()
      .domain(depthExtent)
      .range([0, height]); // Note: We invert the range for depth (top to bottom)
    
    // Create y-axis
    const depthAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${d}${lasFile.depthUnit}`);
    
    svg.append('g')
      .attr('class', 'y-axis')
      .call(depthAxis);
    
    // Add depth axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(`Depth (${lasFile.depthUnit})`);
    
    // Draw grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      );
    
    // Determine visualization mode (single track or multi-track)
    if (displayMode === 'single') {
      // Single track visualization: all curves on the same plot
      renderSingleTrack(svg, width, height, selectedCurves);
    } else {
      // Multi-track visualization: each curve on its own track
      renderMultiTrack(svg, width, height, selectedCurves);
    }
    
    // Helper function to render all curves on a single track
    function renderSingleTrack(svg: d3.Selection<SVGGElement, unknown, null, undefined>, 
                               width: number, 
                               height: number, 
                               curves: string[]) {
      
      // For each selected curve, determine the range and create a line
      curves.forEach((curveName, index) => {
        if (!lasFile.data.curves[curveName]) return;
        
        // Get curve data
        const curveData = lasFile.data.curves[curveName];
        
        // Calculate domain for this curve
        const valueExtent = d3.extent(curveData.filter(d => !isNaN(d))) as [number, number];
        
        // Create scale for this curve
        const xScale = d3.scaleLinear()
          .domain(valueExtent)
          .range([0, width])
          .nice();
        
        // Create curve line
        const line = d3.line<number>()
          .x((d, i) => xScale(curveData[i] || 0))
          .y((d, i) => yScale(lasFile.data.depth[i]))
          .defined((d, i) => !isNaN(curveData[i]));
        
        // Add curve path
        svg.append('path')
          .datum(curveData)
          .attr('class', 'curve-path')
          .attr('stroke', CURVE_COLORS[index % CURVE_COLORS.length])
          .attr('d', line);
        
        // Add x-axis for this curve
        if (index === 0) {
          // Main x-axis at the bottom
          svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
            
          // Add curve name as x-axis label
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom - 5)
            .style('text-anchor', 'middle')
            .attr('fill', CURVE_COLORS[index % CURVE_COLORS.length])
            .text(curveName);
        } else {
          // Additional x-axes at the top with different colors
          const axis = d3.axisTop(xScale);
          svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,0)`)
            .call(axis)
            .attr('color', CURVE_COLORS[index % CURVE_COLORS.length]);
            
          // Add curve name as x-axis label
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top + 5)
            .style('text-anchor', 'middle')
            .attr('fill', CURVE_COLORS[index % CURVE_COLORS.length])
            .text(curveName);
        }
      });
    }
    
    // Helper function to render each curve on its own track
    function renderMultiTrack(svg: d3.Selection<SVGGElement, unknown, null, undefined>, 
                              width: number, 
                              height: number, 
                              curves: string[]) {
      
      // Calculate track width based on number of curves
      const trackWidth = width / curves.length;
      
      // For each selected curve, create its own track
      curves.forEach((curveName, index) => {
        if (!lasFile.data.curves[curveName]) return;
        
        // Get curve data
        const curveData = lasFile.data.curves[curveName];
        
        // Calculate domain for this curve
        const valueExtent = d3.extent(curveData.filter(d => !isNaN(d))) as [number, number];
        
        // Create scale for this curve within its track
        const xScale = d3.scaleLinear()
          .domain(valueExtent)
          .range([index * trackWidth, (index + 1) * trackWidth])
          .nice();
        
        // Create curve line
        const line = d3.line<number>()
          .x((d, i) => xScale(curveData[i] || 0))
          .y((d, i) => yScale(lasFile.data.depth[i]))
          .defined((d, i) => !isNaN(curveData[i]));
        
        // Add track background
        svg.append('rect')
          .attr('x', index * trackWidth)
          .attr('y', 0)
          .attr('width', trackWidth)
          .attr('height', height)
          .attr('fill', index % 2 === 0 ? '#f9f9f9' : '#ffffff')
          .attr('stroke', '#ddd');
        
        // Add curve path
        svg.append('path')
          .datum(curveData)
          .attr('class', 'curve-path')
          .attr('stroke', CURVE_COLORS[index % CURVE_COLORS.length])
          .attr('d', line);
        
        // Add track title
        svg.append('text')
          .attr('x', index * trackWidth + trackWidth / 2)
          .attr('y', -5)
          .style('text-anchor', 'middle')
          .attr('fill', CURVE_COLORS[index % CURVE_COLORS.length])
          .attr('font-weight', 'bold')
          .text(curveName);
      });
    }
    
  }, [lasFile, selectedCurves, displayMode]);

  // Toggle curve selection
  const toggleCurve = (curveName: string) => {
    setSelectedCurves(prev => {
      if (prev.includes(curveName)) {
        return prev.filter(c => c !== curveName);
      } else {
        return [...prev, curveName];
      }
    });
  };

  // Toggle display mode (single track vs multi-track)
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'single' ? 'multi' : 'single');
  };

  if (!lasFile) {
    return <div>No LAS file loaded</div>;
  }

  return (
    <div className="well-log-container">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{lasFile.fileName}</h2>
        <button
          onClick={toggleDisplayMode}
          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
        >
          {displayMode === 'single' ? 'Switch to Multi-Track View' : 'Switch to Single-Track View'}
        </button>
      </div>
      
      {/* Well metadata summary */}
      {logMetadata && (
        <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
          <h3 className="font-medium mb-1">Well Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(logMetadata)
              .filter(([key]) => ['WELL', 'COMP', 'LOC', 'SRVC', 'DATE', 'API'].includes(key))
              .map(([key, data]) => (
                <div key={key}>
                  <span className="text-gray-500">{key}: </span>
                  <span>{data.value} {data.unit}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Curve selector */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Select Curves to Display:</h3>
        <div className="curve-selector">
          {lasFile.curveNames.map(curveName => (
            <button
              key={curveName}
              onClick={() => toggleCurve(curveName)}
              className={`${
                selectedCurves.includes(curveName) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              } px-3 py-1 text-sm rounded`}
            >
              {curveName}
            </button>
          ))}
        </div>
      </div>
      
      {/* Visualization container */}
      <div className="curve-container" ref={containerRef}></div>
    </div>
  );
};

export default WellLogViewer; 