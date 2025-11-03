import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { LoadingService } from '../../core/spinner/loading.service'
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, MatInputModule, MatIconModule, NgClass, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  form!: FormGroup;
  estaCarregando$!: Observable<boolean>;
  hide = signal(true);

  constructor(
    private loading: LoadingService,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastrService: ToastrService) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.estaCarregando$ = this.loading.estaCarregado();
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  login() {
    if (this.form?.invalid) {
      for (let erro of this.form.validate()) {
        this.toastrService.warning(erro);
      }

      return;
    }

    this.authService.login(this.form.value).subscribe({
      next: (res) => this.processarSucesso(),
      error: (err) => this.processarFalha(err)
    })
  }

  processarSucesso() {
    this.router.navigate(['/dashboard']);
  }

  processarFalha(error: Error){
    this.toastrService.error(error.message, 'Erro');
  }
}
