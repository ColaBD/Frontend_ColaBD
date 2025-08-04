import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellComponent } from "./core/shell/shell.component";
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { AuthService } from './core/auth/services/auth.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ShellComponent, MatTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ColaBD';
  usuarioEstaLogado$!: Observable<any>;

  constructor(private authService: AuthService){}

  ngOnInit(): void {
    this.usuarioEstaLogado$ = this.authService.observarToken();
  }
}
