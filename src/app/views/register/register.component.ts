import { NgClass } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { LoadingService } from '../../core/spinner/loading.service';

@Component({
  selector: 'app-register',
  imports: [MatButtonModule, MatInputModule, MatIconModule, NgClass, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
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
      username: new FormControl('', [Validators.required, Validators.minLength(5)]),
      password: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  register() {
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
      `Register Succed`,
      'Success'
    );

    this.router.navigate(['/dashboard']);
  }

  processarFalha(erro: Error) {
    this.toastrService.error(erro.message, 'Erro');
  }
}
