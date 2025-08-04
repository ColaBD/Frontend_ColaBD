import { inject } from "@angular/core";
import { CanActivateFn, Router, UrlTree } from "@angular/router";
import { Observable, map } from "rxjs";
import { AuthService } from "../services/auth.service";

export const loginGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
    const router = inject(Router);

    return inject(AuthService).observarToken()
        .pipe(
        map((token) => {
        //Nega acesso e redireciona usuario
        if(token){
            return router.parseUrl('/dashboard')
        }

            return true;
        })
    );
} 