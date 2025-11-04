// Schema API Response Models

export interface SchemaApiResponse<T> {
  data: T;
  status_code: number;
  success: boolean;
}

export interface SchemaListItem {
  id: string;
  inserted_at: string | null;
  title: string;
  database_model: string | null;
  display_picture: string;
  updated_at: string | null;
}

export interface SchemaDetails {
  id: string;
  inserted_at: string;
  title: string;
  database_model: string;
  display_picture: string;
  updated_at: string;
}

export interface SchemaCell {
  type: string;
  id: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  attrs: {
    [key: string]: any;
  };
  source?: {
    id: string;
  };
  target?: {
    id: string;
  };
  labels?: Array<{
    attrs: {
      text: {
        text: string;
        fontSize?: number;
        fontWeight?: string;
        fill?: string;
      };
      rect?: {
        fill?: string;
        stroke?: string;
      };
    };
    position: number;
  }>;
  vertices?: Array<{
    x: number;
    y: number;
  }>;
  z?: number;
}

export interface SchemaDetailsResponse {
  schema: SchemaDetails;
  cells: SchemaCell[];
  has_cells: boolean;
  database_model_id: string;
}

export interface SchemaCreateResponse {
  message: string;
  schema_id: string;
  title: string;
}

export type SchemasListResponse = SchemaApiResponse<SchemaListItem[]>;
export type SchemaByIdResponse = SchemaApiResponse<SchemaDetailsResponse>;
export type SchemaCreateApiResponse = SchemaApiResponse<SchemaCreateResponse>; 