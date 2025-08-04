import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { LocalStorageService } from "./local-storage.service";

export const httpTokenInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = inject(LocalStorageService).obterDadosLocaisSalvos()?.access_token;
  
  const reqModificada = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  return next(reqModificada);
}