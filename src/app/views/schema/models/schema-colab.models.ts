export class BaseTable {
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
  
  export class CreateTable extends BaseTable {
    type: string = "standard.Rectangle";
    position!: Position;
    size!: Size;
    attrs!: TableAttrs | {};
  }

  export class UpdateTable extends BaseTable {
    attrs!: Partial<TableAttrs> | {};
  }

  export class MoveTable extends BaseTable {
    position!: Position;
  }

export class DeleteTable extends BaseTable { }
  
export interface LinkEnd {
    id: string;
}

export interface LinkLabelAttrs {
    text?: {
        text: string;
        fontSize?: number;
        fontWeight?: string;
        fill?: string;
    };
    rect?: {
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        rx?: number;
        ry?: number;
    };
}

export interface Label {
    attrs: LinkLabelAttrs;
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

export interface LinkRouter{
    name: string;
}

export interface LinkConnector {
    name: string;
}

export class LinkTable extends BaseTable {
    type: string = "link";
    source!: LinkEnd;
    target!: LinkEnd;
    router?: LinkRouter;
    connector?: LinkConnector;
    labels: Label[] = [];
    attrs: LinkAttrs = {};
}