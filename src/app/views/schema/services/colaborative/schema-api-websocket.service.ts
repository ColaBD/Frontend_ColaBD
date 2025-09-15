import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client'
import { LocalStorageService } from '../../../../core/auth/services/local-storage.service';
import { InfoSchemaColab } from '../../models/schema-colab.models';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchemaApiWebsocketService {
  public schemaAtualizadoSubject = new Subject<InfoSchemaColab>();
  private socket: Socket;
  private baseUrl: string = 'https://develop-colabd.onrender.com';

  constructor(private localStorageService: LocalStorageService) { 
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;

    this.socket = io(this.baseUrl, {
      transports: ["websocket"],
      auth: {token: token}
    });
  }

  //Envia atualização do schema para o servidor
  atualizacaoSchema(snapshot_tabelas: InfoSchemaColab) {
    console.log('Enviando atualização do schema via WebSocket:', snapshot_tabelas);
    this.socket.emit(`atualizacao_schema`, snapshot_tabelas);
  }

  //Recebe atualização do schema do servidor
  onSchemaAtualizado() {
    this.socket.on('schema_atualizado', (snapshot_tabelas_novas: InfoSchemaColab) => {
      console.log("📩 Recebido schema atualizado:", snapshot_tabelas_novas);
      this.schemaAtualizadoSubject.next(snapshot_tabelas_novas);
    });
  }

  // onEstadoInicial(): Observable<any> {
  //   return new Observable(observer => {
  //     this.socket.on('estado_inicial', (data) => {
  //       observer.next(data);
  //     });
  //   });
  // }
}
