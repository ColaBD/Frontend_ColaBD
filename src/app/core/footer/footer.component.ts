import { Component } from '@angular/core';
import { FooterService } from './services/footer.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  showFooter$: Observable<boolean>; 

  constructor(private footerService: FooterService) {
    this.showFooter$ = this.footerService.showFooter$;
  }
}
