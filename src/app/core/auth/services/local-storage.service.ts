import { Injectable } from "@angular/core";
import { TokenVM } from "../model/token.view-model";

@Injectable({
  providedIn: 'root'
})

export class LocalStorageService {
  private chaveLocalStorage: string = 'colabd-token';

  public salvarDadosLocaisUser(token: TokenVM){
    const jsonString = JSON.stringify(token);

    localStorage.setItem(this.chaveLocalStorage, jsonString);    
  }

  public obterDadosLocaisSalvos(): TokenVM | undefined {
    const jsonString = localStorage.getItem(this.chaveLocalStorage);
    
    if(!jsonString){
      return undefined;
    }

    return JSON.parse(jsonString) as TokenVM;
  }

  public getToken(): string {
    const token = this.obterDadosLocaisSalvos()?.access_token;
    return token || '';
  }

  public limparDadosLocais(){
    localStorage.setItem(this.chaveLocalStorage, '');
  }
}