import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private estaCarregando: BehaviorSubject<boolean>;
  
  constructor() { 
    this.estaCarregando = new BehaviorSubject(false);
  }

  mostrarSpinner(){
    this.estaCarregando.next(true);
  }

  esconderSpinner(){
    this.estaCarregando.next(false);
  }

  estaCarregado(){
    return this.estaCarregando.asObservable();
  }
}