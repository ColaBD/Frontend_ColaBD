import { Injectable, OnInit } from '@angular/core';
import { io, Socket } from 'socket.io-client'
import { LocalStorageService } from '../../../../core/auth/services/local-storage.service';
import { Subject } from 'rxjs';
import { BaseElement, CreateTable, DeleteTable, MoveTable, UpdateTable } from '../../models/schema-colab.models';

@Injectable({
  providedIn: 'root'
})
export class SchemaApiWebsocketService {
  public schemaAtualizadoSubject = new Subject<any>();
  private baseUrl: string = "https://develop-colabd.onrender.com";
  public socket: Socket = io(this.baseUrl, {
    transports: ["websocket"],
    autoConnect: false // evita conectar sem auth
  });
  private schema_id: string | null = "";

  constructor(private localStorageService: LocalStorageService) { }

  connectWS(schemaId: string | null){
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;

    // aqui é chamado a função connect do backend
    this.socket.auth = {
      token: token,
      schema_id: schemaId
    }

    this.schema_id = schemaId;
    
    this.socket.connect();
    
    // Log quando conectado
    this.socket.on('connect', () => {
      console.log(`✅ WebSocket CONECTADO com ID: ${this.socket.id}`);
    });

    this.socket.on('disconnect', () => {
      console.log(`❌ WebSocket DESCONECTADO`);
    });

    this.socket.on('connect_error', (error) => {
      console.log(`⚠️ WebSocket ERRO DE CONEXÃO:`, error);
    });

    // necessário para chamar as funções de escuta
    this.onCreatedSchema();
    this.onUpdatedSchema();
    this.onDeletedSchema();
    this.onMovedSchema();
    this.onCursorMoved();
    this.onCursorLeaved();
  }

  //Envia atualização do schema para o servidor
  atualizacaoSchema(schema_update: BaseElement, channel_emit: string) {
    console.log('Enviando atualização do schema via WebSocket');

    const endpoint_ws = `${channel_emit}_${this.schema_id}`;
    this.socket.emit(endpoint_ws, schema_update);
  }

  private toClass<T extends object>(cls: new () => T, data: any): void {
    const received_data = Object.assign(new cls(), data);
    console.log("📩 Recebido schema atualizado", received_data);
    this.schemaAtualizadoSubject.next(received_data);
  }
  
  onCreatedSchema(){
    this.socket.on(`receive_new_element_${this.schema_id}`, (data: any) => {
      this.toClass(CreateTable, data);
    });
  }

  onDeletedSchema(){
    this.socket.on(`receive_deleted_element_${this.schema_id}`, (data: any) => {
      this.toClass(DeleteTable, data);
    });
  }

  onUpdatedSchema(){
    this.socket.on(`receive_updated_table_${this.schema_id}`, (data: any) => {
      this.toClass(UpdateTable, data);
    });
  }

  onMovedSchema(){
    this.socket.on(`receive_moved_table_${this.schema_id}`, (data: any) => {
      this.toClass(MoveTable, data);
    });
  }

  onCursorMoved(){
    this.socket.on(`cursor_update_${this.schema_id}`, (data: any) => {
      // O serviço de cursor vai receber esse evento direto do socket
    });
  }

  onCursorLeaved(){
    this.socket.on(`cursor_leave_${this.schema_id}`, (data: any) => {
      // O serviço de cursor vai receber esse evento direto do socket
    });
  }
}
