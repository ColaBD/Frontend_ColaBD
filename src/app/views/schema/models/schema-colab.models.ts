export class BaseElement {
    id: string = "";
  }

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TableLabelAttrs {
  text: string;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
}

export interface RowNameAttr {
  text: string;
  fontSize?: number;
  fill?: string;
}

export interface RowTypeAttr {
  text: string;
  fontSize?: number;
  fill?: string;
}

export interface RowMetaAttr {
  pk: boolean;
  fk: boolean;
}

export interface TableAttrs {
  label: TableLabelAttrs;
  [key: `row@${number}-name`]: RowNameAttr;
  [key: `row@${number}-type`]: RowTypeAttr;
  [key: `row@${number}-meta`]: RowMetaAttr;
}

export class CreateTable extends BaseElement {
  type: string = "standard.Rectangle";
  position!: Position;
  size!: Size;
  attrs!: TableAttrs | {};
}

export class UpdateTable extends BaseElement {
  type: string = "standard.Rectangle";
  attrs!: Partial<TableAttrs> | {};
}

export class MoveTable extends BaseElement {
  position!: Position;
}

export class DeleteTable extends BaseElement { }
  
export interface LinkEnd {
  id?: string;
}

export class TextUpdateLinkLabelAttrs extends BaseElement {
  type: string = "standard.Link";
  text?: string;
}

export interface TextLinkLabelAttrs {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
}

export interface RectLinkLabelAttrs {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
}

export interface LinkLabelAttrs {
  text?: TextLinkLabelAttrs;
  rect?: RectLinkLabelAttrs;
}

export interface Label {
  attrs?: LinkLabelAttrs;
  position?: number;
}

export interface LinkAttrs {
  ".connection"?: {
    stroke?: string;
    strokeWidth?: number;
    "pointer-events"?: string;
  };
  ".marker-source"?: {
    d?: string;
    fill?: string;
    stroke?: string;
    "stroke-width"?: number;
  };
  ".marker-target"?: {
    d?: string;
    fill?: string;
    stroke?: string;
    "stroke-width"?: number;
  };
}

export interface RouterConnector{
  name: string;
}
export class LinkTable extends BaseElement {
  type: string = "link";
  source?: LinkEnd;
  target?: LinkEnd;
  labels: Label[] = [];
  attrs: LinkAttrs = {};
}