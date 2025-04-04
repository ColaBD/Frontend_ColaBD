import { Component } from '@angular/core';
import { FooterService } from '../../core/footer/services/footer.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  imports: [MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  constructor(private footerService: FooterService) {}
  
  ngOnInit() {
    this.footerService.setFooterVisibility(false); //adicionar isso para esconder o footer
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true); //adicionar isso para voltar a aparecer o footer
  }
}
