// JointJS Data Structure Interfaces
// These interfaces represent the format that comes from the backend (JointJS graph format)

export interface JointJSGraph {
  cells: JointJSCell[];
}

export interface JointJSCell {
  type: string;
  id: string;
  attrs?: JointJSAttrs;
  position?: JointJSPosition;
  size?: JointJSSize;
  source?: JointJSConnectionPoint;
  target?: JointJSConnectionPoint;
  vertices?: JointJSPosition[];
  labels?: JointJSLabel[];
  z?: number;
  [key: string]: any; // Allow for additional properties
}

export interface JointJSAttrs {
  label?: JointJSAttr;
  'row@-name'?: JointJSAttr;
  'row@-type'?: JointJSAttr;
  'row@-meta'?: JointJSAttr;
  [key: string]: JointJSAttr | undefined;
}

export interface JointJSAttr {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
  ref?: string;
  refX?: string | number;
  refY?: string | number;
  textAnchor?: string;
  yAlignment?: string;
  pk?: boolean;
  fk?: boolean;
  [key: string]: any;
}

export interface JointJSPosition {
  x: number;
  y: number;
}

export interface JointJSSize {
  width: number;
  height: number;
}

export interface JointJSConnectionPoint {
  id: string;
  port?: string;
}

export interface JointJSLabel {
  attrs?: {
    text?: JointJSAttr;
    rect?: JointJSAttr;
  };
  position?: number | JointJSPosition;
}

// Parsed data interfaces for our internal use
export interface ParsedTableData {
  id: string;
  name: string;
  columns: ParsedColumnData[];
  position?: JointJSPosition;
  size?: JointJSSize;
}

export interface ParsedColumnData {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
  length?: number;
}

export interface ParsedRelationshipData {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceColumnId?: string;
  targetColumnId?: string;
  type?: string;
  vertices?: JointJSPosition[];
}

export interface ParsedSchemaData {
  tables: ParsedTableData[];
  relationships: ParsedRelationshipData[];
}