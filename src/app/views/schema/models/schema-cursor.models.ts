export interface CursorPosition {
  user_id: string;
  user_name: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export interface CursorUpdate {
  user_id: string;
  x: number;
  y: number;
}
