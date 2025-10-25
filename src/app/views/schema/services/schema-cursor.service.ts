import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CursorPosition, CursorUpdate } from '../models/schema-cursor.models';
import { SchemaApiWebsocketService } from './colaborative/schema-api-websocket.service';

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

@Injectable({
  providedIn: 'root'
})
export class SchemaCursorService {
  private cursors: BehaviorSubject<Map<string, CursorPosition>> = new BehaviorSubject(new Map());
  private schemaId: string | null = null;
  private currentUserId: string | null = null;
  private sessionId: string = this.generateSessionId(); // ID único por aba/sessão
  private currentUserName: string = 'Você';
  private cursorColor: string = '#FF6B6B';
  private cursorTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly CURSOR_UPDATE_INTERVAL = 30; // ms - reduzido de 100ms para mais responsividade
  private readonly CURSOR_MOVE_THRESHOLD = 2; // pixels - reduzido de 5px para mais sensibilidade
  private lastCursorX = 0;
  private lastCursorY = 0;
  private lastEmissionTime = 0;

  constructor(private socketService: SchemaApiWebsocketService) {}

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initialize(schemaId: string | null, userId: string, userName: string = 'Usuário'): void {
    this.schemaId = schemaId;
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.cursorColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

    if (schemaId) {
      this.setupCursorListeners();
    }
  }

  private setupCursorListeners(): void {
    if (!this.schemaId) return;

    // Listen for cursor updates from other users
    this.socketService.socket?.on(
      `cursor_update_${this.schemaId}`,
      (data: CursorPosition) => {
        this.handleRemoteCursor(data);
      }
    );

    // Listen for cursor leave
    this.socketService.socket?.on(
      `cursor_leave_${this.schemaId}`,
      (data: { user_id: string }) => {
        this.handleCursorLeave(data.user_id);
      }
    );
  }

  private handleRemoteCursor(cursor: CursorPosition): void {
    // Aceitar TODOS os cursores, não filtrar por user_id
    // Isso permite ver cursores do mesmo usuário em abas diferentes

    const cursors = this.cursors.value;
    cursors.set(cursor.user_id, cursor);
    this.cursors.next(new Map(cursors));
  }

  private handleCursorLeave(userId: string): void {
    const cursors = this.cursors.value;
    cursors.delete(userId);
    this.cursors.next(new Map(cursors));
  }

  updateCursor(x: number, y: number): void {
    if (!this.schemaId || !this.currentUserId) return;

    const agora = Date.now();
    const distância = Math.sqrt(
      Math.pow(x - this.lastCursorX, 2) + Math.pow(y - this.lastCursorY, 2)
    );

    // Verificar throttle (100ms) E threshold (5px)
    if (agora - this.lastEmissionTime < this.CURSOR_UPDATE_INTERVAL || distância < this.CURSOR_MOVE_THRESHOLD) {
      return;
    }

    this.lastCursorX = x;
    this.lastCursorY = y;
    this.lastEmissionTime = agora;

    const eventName = `cursor_move_${this.schemaId}`;

    (this.socketService as any).socket?.emit(eventName, {
      user_id: this.currentUserId,
      user_name: this.currentUserName,
      x,
      y,
      color: this.cursorColor
    });
  }

  leaveDiagram(): void {
    if (!this.schemaId || !this.currentUserId) return;

    const eventName = `cursor_leave_${this.schemaId}`;
    (this.socketService as any).socket?.emit(eventName, {
      user_id: this.currentUserId
    });

    if (this.cursorTimeout) clearTimeout(this.cursorTimeout);
    this.cursors.next(new Map());
  }

  getCursors(): Observable<Map<string, CursorPosition>> {
    return this.cursors.asObservable();
  }

  getCurrentCursorColor(): string {
    return this.cursorColor;
  }

  destroy(): void {
    this.leaveDiagram();
    if (this.cursorTimeout) clearTimeout(this.cursorTimeout);
    this.cursors.complete();
  }
}
