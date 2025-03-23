import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FooterService {
  private showFooter = new BehaviorSubject<boolean>(true); // Variável global
  showFooter$ = this.showFooter.asObservable(); // Observable para os componentes

  setFooterVisibility(isVisible: boolean) {
    this.showFooter.next(isVisible); // Atualiza o valor da variável
  }
}