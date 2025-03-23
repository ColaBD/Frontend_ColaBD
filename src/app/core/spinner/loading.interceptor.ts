import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { LoadingService } from "./loading.service";
import { finalize } from "rxjs";

export const loadingInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const loadingService = inject(LoadingService);

  loadingService.mostrarSpinner();

  return next(req).pipe(
    finalize(() =>  loadingService.esconderSpinner())
  );
}