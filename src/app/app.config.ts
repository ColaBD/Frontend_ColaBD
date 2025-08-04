import { APP_INITIALIZER, ApplicationConfig, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations'; 
import { provideToastr } from 'ngx-toastr'; 
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/spinner/loading.interceptor';
import { AuthService } from './core/auth/services/auth.service';
import { httpTokenInterceptor } from './core/auth/services/http-token.interceptor';
import { LoadingService } from './core/spinner/loading.service';
import { LocalStorageService } from './core/auth/services/local-storage.service';

function appInit(){
  const authService = inject(AuthService);
  return () => authService.logarUsuarioSalvo();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAnimations(), 
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideToastr({
      timeOut: 1500,  
      positionClass: 'toast-bottom-right', // Posição do toast
      preventDuplicates: true, // Evita toasts duplicados
      closeButton: true, // Adiciona botão de fechar
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: appInit,
      deps: [LocalStorageService],
      multi: true
    },
    provideHttpClient(withInterceptors([httpTokenInterceptor, loadingInterceptor])),
    LoadingService
  ]
};
