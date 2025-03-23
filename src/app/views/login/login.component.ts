import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { LoadingService } from '../../core/spinner/loading.service'

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
    private formBuilder: FormBuilder,
    private router: Router,
    // private authService: AuthService,
    private toastrService: ToastrService) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      password: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  login() {
    // if (this.form?.invalid) {
    //   for (let erro of this.form.validate()) {
    //     this.toastrService.warning(erro);
    //   }

    //   return;
    // }

    this.processarSucesso();
  }

  processarSucesso() {
    this.toastrService.success(
      `Login Succed`,
      'Success'
    );

    this.router.navigate(['/dashboard']);
  }

  processarFalha(erro: Error) {
    this.toastrService.error(erro.message, 'Erro');
  }
}
