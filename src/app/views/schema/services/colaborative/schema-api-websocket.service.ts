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
  private baseUrl: string = 'https://backend-colabd.onrender.com/';
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
    
    this.socket.on('connect', () => {
      // WebSocket connected
    });

    this.socket.on('disconnect', () => {
      // WebSocket disconnected
    });

    this.socket.on('connect_error', (error) => {
      // WebSocket connection error
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
    this.socket.emit(channel_emit, schema_update);
  }

  private toClass<T extends object>(cls: new () => T, data: any): void {
    const received_data = Object.assign(new cls(), data);
    this.schemaAtualizadoSubject.next(received_data);
  }
  
  onCreatedSchema(){
    this.socket.on('receive_new_element', (data: any) => {
      this.toClass(CreateTable, data);
    });
  }

  onDeletedSchema(){
    this.socket.on('receive_deleted_element', (data: any) => {
      this.toClass(DeleteTable, data);
    });
  }

  onUpdatedSchema(){
    this.socket.on('receive_updated_table', (data: any) => {
      this.toClass(UpdateTable, data);
    });
  }

  onMovedSchema(){
    this.socket.on('receive_moved_table', (data: any) => {
      this.toClass(MoveTable, data);
    });
  }

  onCursorMoved(){
    this.socket.on('cursor_update', (data: any) => {
      // O serviço de cursor vai receber esse evento direto do socket
    });
  }

  onCursorLeaved(){
    this.socket.on('cursor_leave', (data: any) => {
      // O serviço de cursor vai receber esse evento direto do socket
    });
  }
}
