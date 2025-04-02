import { HeaderSection, HeaderItem, LASFile, LASHeader, LASData } from '../types/LASTypes';

// Parse a LAS file content into our LASFile structure
export function parseLASFile(content: string, fileName: string): LASFile {
  try {
    console.log("Starting to parse LAS file...");
    
    // Split the file into sections
    const sections = splitSections(content);
    
    console.log("Found sections:", Object.keys(sections));
    
    // More tolerant check for section presence
    // Our parser will try to work with whatever sections are available
    const hasVersionSection = sections['~V'] || sections['~VERSION'];
    const hasWellSection = sections['~W'] || sections['~WELL'];
    const hasCurveSection = sections['~C'] || sections['~CURVE'];
    const hasDataSection = sections['~A'] || sections['~ASCII'];
    
    // Create header sections with reasonable defaults for missing sections
    const header: LASHeader = {
      version: hasVersionSection 
        ? parseHeaderSection(sections['~V'] || sections['~VERSION'], 'Version')
        : { name: 'Version', sections: [] },
        
      well: hasWellSection 
        ? parseHeaderSection(sections['~W'] || sections['~WELL'], 'Well') 
        : { name: 'Well', sections: [] },
        
      curve: hasCurveSection 
        ? parseHeaderSection(sections['~C'] || sections['~CURVE'], 'Curve')
        : { name: 'Curve', sections: [] },
        
      parameter: sections['~P'] || sections['~PARAMETER'] 
        ? parseHeaderSection(sections['~P'] || sections['~PARAMETER'], 'Parameter') 
        : undefined,
        
      other: sections['~O'] || sections['~OTHER']
        ? parseHeaderSection(sections['~O'] || sections['~OTHER'], 'Other') 
        : undefined
    };
    
    // If we don't have curve definitions but we have data, try to create simple curve definitions
    if (!hasCurveSection && hasDataSection) {
      // Create simple curve definitions based on the first line of data
      const dataLines = (sections['~A'] || sections['~ASCII']).split('\n');
      if (dataLines.length > 1) {
        const firstDataLine = dataLines[1]; // Skip header line
        const values = firstDataLine.trim().split(/\s+/).filter(Boolean);
        
        // Create curve definitions
        for (let i = 0; i < values.length; i++) {
          const curveName = i === 0 ? 'DEPTH' : `CURVE_${i}`;
          header.curve.sections.push({
            mnemonic: curveName,
            unit: '',
            data: '',
            description: i === 0 ? 'Depth' : `Curve ${i}`,
            value: curveName
          });
        }
        
        console.log("Created default curve definitions:", header.curve.sections.map(s => s.mnemonic));
      }
    }
    
    // Parse data section - be more tolerant with data section name
    const dataSection = sections['~A'] || sections['~ASCII'];
    const data = dataSection
      ? parseDataSection(dataSection, header.curve.sections)
      : createEmptyDataSection();
    
    // Extract curve names from the curve section
    const curveNames = header.curve.sections.map(curve => curve.mnemonic);
    
    // If we don't have any curve names but have data, create some default names
    if (curveNames.length === 0 && data.depth.length > 0) {
      // Number of curves is the number of columns in the data
      const numCurves = Object.keys(data.curves).length;
      for (let i = 0; i < numCurves; i++) {
        curveNames.push(`Curve_${i}`);
      }
    }
    
    // Get depth unit from the well section, with fallback to default
    let depthUnit = 'ft'; // Default unit
    if (hasWellSection) {
      const depthSection = header.well.sections.find(item => 
        item.mnemonic.toLowerCase().includes('dept') || 
        item.mnemonic.toLowerCase().includes('dep'));
      
      if (depthSection && depthSection.unit) {
        depthUnit = depthSection.unit;
      }
    }
    
    console.log("Finished parsing LAS file successfully");
    
    return {
      header,
      data,
      curveNames,
      depthUnit,
      fileName
    };
  } catch (error) {
    console.error('Error parsing LAS file:', error);
    
    // If parsing fails, try a simpler fallback approach
    try {
      console.log("Trying fallback parsing approach...");
      return parseSimpleLAS(content, fileName);
    } catch (fallbackError) {
      console.error('Fallback parsing also failed:', fallbackError);
      throw new Error(`Failed to parse LAS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Fallback simple LAS parser - very tolerant of format issues
function parseSimpleLAS(content: string, fileName: string): LASFile {
  console.log("Using simple LAS parser");
  
  // Split the content into lines
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  
  // Initialize basic data structures
  const data: LASData = {
    depth: [],
    curves: {}
  };
  
  // Find the data section
  let dataStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('~A') || lines[i].trim().startsWith('~ASCII')) {
      dataStartLine = i + 1;
      break;
    }
  }
  
  // If we couldn't find the data section, look for the first line that starts with a number
  if (dataStartLine === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('~') && !line.startsWith('#') && !isNaN(parseFloat(line.split(/\s+/)[0]))) {
        dataStartLine = i;
        break;
      }
    }
  }
  
  console.log("Data section starts at line:", dataStartLine);
  
  // Create some default curve names
  const curveNames: string[] = ['DEPTH'];
  
  // Find the maximum number of columns in the data
  let maxColumns = 0;
  for (let i = dataStartLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    
    const values = line.split(/\s+/).filter(Boolean);
    maxColumns = Math.max(maxColumns, values.length);
  }
  
  // Create curve names for each column
  for (let i = 1; i < maxColumns; i++) {
    curveNames.push(`CURVE_${i}`);
  }
  
  // Initialize curve arrays
  curveNames.forEach(name => {
    data.curves[name] = [];
  });
  
  // Parse data lines
  for (let i = dataStartLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    
    const values = line.split(/\s+/).filter(Boolean);
    if (values.length > 0) {
      const depth = parseFloat(values[0]);
      if (!isNaN(depth)) {
        data.depth.push(depth);
        
        // Parse remaining values
        for (let j = 1; j < values.length && j < curveNames.length; j++) {
          const value = parseFloat(values[j]);
          data.curves[curveNames[j]].push(isNaN(value) ? NaN : value);
        }
        
        // Fill missing values
        for (let j = values.length; j < curveNames.length; j++) {
          data.curves[curveNames[j]].push(NaN);
        }
      }
    }
  }
  
  console.log("Parsed data with simple parser, found", data.depth.length, "rows");
  
  // Create a minimal header
  const headerMock: LASHeader = {
    version: { name: 'Version', sections: [] },
    well: { name: 'Well', sections: [] },
    curve: { 
      name: 'Curve', 
      sections: curveNames.map(name => ({
        mnemonic: name,
        unit: '',
        data: '',
        description: name === 'DEPTH' ? 'Depth' : `Curve ${name}`,
        value: name
      }))
    }
  };
  
  return {
    header: headerMock,
    data,
    curveNames,
    depthUnit: 'ft',
    fileName
  };
}

// Split the file content into its main sections
function splitSections(content: string): { [key: string]: string } {
  console.log("Splitting LAS file into sections");
  
  const sections: { [key: string]: string } = {};
  let currentSection = '';
  let currentContent = '';
  
  // Replace carriage returns with newlines
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Process each line
  const lines = content.split('\n');
  const maxLines = Math.min(lines.length, 50000); // Limit to prevent memory issues with very large files
  
  for (let i = 0; i < maxLines; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;
    
    // Check if this is a section header (more tolerant pattern matching)
    if (line.startsWith('~')) {
      // If we were in a section before, save it
      if (currentSection) {
        sections[currentSection] = currentContent;
      }
      
      // Start a new section - take the first word as the section name
      const sectionParts = line.split(/\s+/);
      currentSection = sectionParts[0].toUpperCase(); // Normalize to uppercase
      currentContent = line + '\n';
    } else if (currentSection) {
      // Add line to current section
      currentContent += line + '\n';
    }
  }
  
  // Save the last section
  if (currentSection) {
    sections[currentSection] = currentContent;
  }
  
  return sections;
}

// Create an empty data section when no data is available
function createEmptyDataSection(): LASData {
  return {
    depth: [],
    curves: {}
  };
}

// Parse a header section into our structured format
function parseHeaderSection(sectionContent: string, sectionName: string): HeaderSection {
  if (!sectionContent) {
    return {
      name: sectionName,
      sections: []
    };
  }
  
  const lines = sectionContent.split('\n');
  const headerItems: HeaderItem[] = [];
  
  // Skip the first line as it's the section header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;
    
    try {
      // Try first with standard format: MNEM.UNIT    DATA    : DESCRIPTION
      const dotPosition = line.indexOf('.');
      const colonPosition = line.indexOf(':');
      
      if (dotPosition > 0 && colonPosition > dotPosition) {
        const mnemonic = line.substring(0, dotPosition).trim();
        const unit = line.substring(dotPosition + 1, line.indexOf(' ', dotPosition)).trim();
        const data = line.substring(line.indexOf(' ', dotPosition), colonPosition).trim();
        const description = colonPosition >= 0 ? line.substring(colonPosition + 1).trim() : '';
        
        // Try to convert data to numeric value if possible
        let value: number | string = data;
        const numValue = parseFloat(data);
        if (!isNaN(numValue)) {
          value = numValue;
        }
        
        headerItems.push({
          mnemonic,
          unit,
          data,
          description,
          value
        });
      } else if (colonPosition > 0) {
        // Try alternate format without dot: MNEM DATA : DESCRIPTION
        const mnemonic = line.substring(0, line.indexOf(' ')).trim();
        const data = line.substring(line.indexOf(' '), colonPosition).trim();
        const description = line.substring(colonPosition + 1).trim();
        
        // Try to convert data to numeric value if possible
        let value: number | string = data;
        const numValue = parseFloat(data);
        if (!isNaN(numValue)) {
          value = numValue;
        }
        
        headerItems.push({
          mnemonic,
          unit: '',
          data,
          description,
          value
        });
      }
    } catch (error) {
      console.warn(`Error parsing header line: ${line}`, error);
      // Continue with next line instead of failing the whole parse
    }
  }
  
  return {
    name: sectionName,
    sections: headerItems
  };
}

// Parse the data section into our structured format
function parseDataSection(sectionContent: string, curveDefinitions: HeaderItem[]): LASData {
  console.log("Parsing data section with", curveDefinitions.length, "curve definitions");
  
  if (!sectionContent) {
    return createEmptyDataSection();
  }
  
  const lines = sectionContent.split('\n');
  const curveNames = curveDefinitions.map(curve => curve.mnemonic);
  
  // Initialize data structure
  const data: LASData = {
    depth: [],
    curves: {}
  };
  
  // Initialize arrays for each curve
  curveNames.forEach(name => {
    data.curves[name] = [];
  });
  
  // If we have no curve definitions, try to determine them from the first data line
  if (curveNames.length === 0 && lines.length > 1) {
    // Take the first data line and count columns
    const firstDataLine = lines[1].trim(); // Skip the section header
    const columns = firstDataLine.split(/\s+/).filter(Boolean).length;
    
    // Create default curve names
    for (let i = 0; i < columns; i++) {
      const name = i === 0 ? 'DEPTH' : `CURVE_${i}`;
      curveNames.push(name);
      data.curves[name] = [];
    }
    
    console.log("Created", curveNames.length, "default curve names from data");
  }
  
  // Limit the number of lines we process for performance reasons
  const maxLines = Math.min(lines.length, 20000);
  
  // Skip the first line as it's the section header
  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;
      
      // Split the line by whitespace
      const values = line.split(/\s+/).filter(v => v.trim().length > 0);
      
      // Process if we have values
      if (values.length > 0) {
        // The first column is typically depth
        const depth = parseFloat(values[0]);
        
        if (!isNaN(depth)) {
          data.depth.push(depth);
          
          // Parse the remaining values, up to the number of curve names we have
          for (let j = 0; j < Math.min(curveNames.length, values.length); j++) {
            const curveName = curveNames[j];
            let value = parseFloat(values[j]);
            
            // Check if it's a valid number
            if (!isNaN(value)) {
              data.curves[curveName].push(value);
            } else {
              // Use NaN for invalid entries
              data.curves[curveName].push(NaN);
            }
          }
          
          // Fill missing values with NaN if we have fewer values than curve names
          for (let j = values.length; j < curveNames.length; j++) {
            data.curves[curveNames[j]].push(NaN);
          }
        }
      }
    } catch (error) {
      console.warn(`Error parsing data line ${i}`, error);
      // Continue with next line instead of failing the whole parse
    }
  }
  
  console.log("Parsed", data.depth.length, "data rows");
  return data;
}

// Alternative approach for LAS files that use the pipe format
export function parsePipeDelimitedLAS(content: string, fileName: string): LASFile {
  try {
    // Basic implementation - this would need to be expanded
    const lines = content.split('\n');
    const data: LASData = {
      depth: [],
      curves: {}
    };
    
    // Assuming the first row contains column headers
    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    
    // Initialize curves
    headers.forEach(header => {
      data.curves[header] = [];
    });
    
    // Limit the number of lines we process for performance reasons
    const maxLines = Math.min(lines.length, 20000);
    
    // Start from the second line (index 1)
    for (let i = 1; i < maxLines; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split('|').map(v => v.trim());
        
        // Assuming the first column is depth
        if (values.length > 1 && !isNaN(parseFloat(values[0]))) {
          const depth = parseFloat(values[0]);
          data.depth.push(depth);
          
          // Parse remaining values
          for (let j = 1; j < values.length && j < headers.length; j++) {
            const value = parseFloat(values[j]);
            if (!isNaN(value)) {
              data.curves[headers[j]].push(value);
            } else {
              data.curves[headers[j]].push(NaN);
            }
          }
        }
      } catch (error) {
        console.warn(`Error parsing pipe-delimited line ${i}`, error);
        // Continue with next line instead of failing
      }
    }
    
    // Create a minimal header structure
    const headerMock: LASHeader = {
      version: { name: 'Version', sections: [] },
      well: { name: 'Well', sections: [] },
      curve: { 
        name: 'Curve', 
        sections: headers.map(header => ({
          mnemonic: header,
          unit: '',
          data: '',
          description: '',
          value: header
        }))
      }
    };
    
    return {
      header: headerMock,
      data,
      curveNames: headers,
      depthUnit: 'unknown',
      fileName
    };
  } catch (error) {
    console.error('Error parsing pipe-delimited LAS file:', error);
    throw new Error(`Failed to parse pipe-delimited LAS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 