import { Injectable, OnInit } from '@angular/core';
import { io, Socket } from 'socket.io-client'
import { LocalStorageService } from '../../../../core/auth/services/local-storage.service';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BaseTable, CreateTable, DeleteTable, MoveTable, UpdateTable } from '../../models/schema-colab.models';

@Injectable({
  providedIn: 'root'
})
export class SchemaApiWebsocketService {
  public schemaAtualizadoSubject = new Subject<any>();
  private baseUrl: string = 'https://develop-colabd.onrender.com';
  private socket: Socket = io(this.baseUrl, {
    transports: ["websocket"],
    autoConnect: false // evita conectar sem auth
  });

  constructor(private localStorageService: LocalStorageService, private route: ActivatedRoute) { }

  connectWS(schemaId: string | null){
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;
    
    // aqui é chamado a função connect do backend
    this.socket.auth = {
      token: token,
      schema_id: schemaId
    }
    
    this.socket.connect();

    // necessário para chamar as funções de escuta
    this.onCreatedSchema();
    this.onUpdatedSchema();
    this.onDeletedSchema();
    this.onMovedSchema();
  }

  //Envia atualização do schema para o servidor
  atualizacaoSchema(schema_update: BaseTable, channel_emit: string) {
    console.log('Enviando atualização do schema via WebSocket:', schema_update);
    this.socket.emit(channel_emit, schema_update);
  }

  private toClass<T extends object>(cls: new () => T, data: any): void {
    const received_data = Object.assign(new cls(), data);
    console.log("📩 Recebido schema atualizado:", received_data);
    this.schemaAtualizadoSubject.next(received_data);
  }
  
  onCreatedSchema(){
    this.socket.on("receive_new_table", (data: any) => {
      this.toClass(CreateTable, data);
    });
  }

  onDeletedSchema(){
    this.socket.on("receive_deleted_table", (data: any) => {
      this.toClass(DeleteTable, data);
    });
  }

  onUpdatedSchema(){
    this.socket.on("receive_updated_table", (data: any) => {
      this.toClass(UpdateTable, data);
    });
  }

  onMovedSchema(){
    this.socket.on("receive_moved_table", (data: any) => {
      this.toClass(MoveTable, data);
    });
  }
}
