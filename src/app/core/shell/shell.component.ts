import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Observable, map } from 'rxjs';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../spinner/loading.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../auth/services/auth.service';
import { MatExpansionModule } from "@angular/material/expansion";

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FooterComponent,
    MatExpansionModule
]
})
export class ShellComponent {
  estaCarregando$!: Observable<boolean>;
  usuarioEstaLogado$!: Observable<boolean>;

  constructor(private loading: LoadingService,
    private authService: AuthService, 
    private router: Router,
    private toastService: ToastrService) { }

  ngOnInit(): void {
    // ESTÁ COMANDTADO PQ AINDA NÃO FOI FEITA A PARTE DE AUTENTICAÇÃO
    this.usuarioEstaLogado$ = this.authService.observarToken()
      .pipe(
        map((usuario) => {
          if (!usuario) {
            return false;
          }

          return true;
        })
      )

    this.estaCarregando$ = this.loading.estaCarregado();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loading.mostrarSpinner();
      } 
      else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loading.esconderSpinner();
      }
    });
  }

  logout() {
    // NÃO EXISTE A FUNCIONALIDADE DE LOGOUT
    // this.authService.logout().subscribe({
    //   next: () => this.processarSucesso(),
    //   error: (err: Error) => this.processarFalha(err)
    // })
  }

  processarSucesso() {
    this.toastService.success(`Logout com sucesso!`, 'Sucesso');
    this.router.navigate(['/login']);
  }

  processarFalha(error: Error) {
    this.toastService.error(error.message, 'Error');
  }
}
