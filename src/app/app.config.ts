import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations'; 
import { provideToastr } from 'ngx-toastr'; 
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './core/spinner/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAnimations(), 
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideToastr({
      timeOut: 3000,  
      positionClass: 'toast-bottom-right', // Posição do toast
      preventDuplicates: true, // Evita toasts duplicados
      closeButton: true, // Adiciona botão de fechar
    })
  ]
};
