// LAS File structure types

// Header section types
export interface LASHeader {
  version: HeaderSection;
  well: HeaderSection;
  curve: HeaderSection;
  parameter?: HeaderSection;
  other?: HeaderSection;
}

export interface HeaderSection {
  name: string;
  sections: HeaderItem[];
}

export interface HeaderItem {
  mnemonic: string;
  unit: string;
  data: string;
  description: string;
  value: number | string;
}

// Data section types
export interface LASData {
  depth: number[];
  curves: {
    [key: string]: number[];
  };
}

// Complete LAS file type
export interface LASFile {
  header: LASHeader;
  data: LASData;
  curveNames: string[];
  depthUnit: string;
  fileName: string;
}

// Curve visualization types
export interface CurveDisplayOptions {
  color: string;
  visible: boolean;
  scale?: [number, number];
  track?: number;
}

export interface CurveTrackOptions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
} 