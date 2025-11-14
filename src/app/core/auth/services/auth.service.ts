import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from "rxjs";
import { TokenVM } from "../model/token.view-model";
import { RegisterUserVM } from "../model/register-user.view-model";
import { LocalStorageService } from "./local-storage.service";
import { LoginUserVM } from "../model/login-user.view-model";
// import { User } from "../model/user.view-model";

@Injectable({
  providedIn: 'root'
})
export class AuthService{
  private endpoint: string = 'https://backend-colabd.onrender.com/'
  private endpointRegistrar: string = this.endpoint + 'auth/register';
  private endpointLogin: string = this.endpoint + 'auth/login';
  private endpointLogout: string = this.endpoint + 'auth/logout';
  private tokenAutenticado: BehaviorSubject<string | undefined>;

  constructor(private http: HttpClient, private localStorageService: LocalStorageService){
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;
    this.tokenAutenticado = new BehaviorSubject<string | undefined>(token);
  }
  
  private returnError(msgErro: string){
    return throwError(() => new Error(msgErro))
  }

  private notificarLogin(token: string): void {
    this.tokenAutenticado.next(token) 
  }

  private notificarLogOut(){
    this.tokenAutenticado.next(undefined); // o next serve para atualizar (dar um outro subscribe) um determinado 
                                            // atributo nos objetos que estão inscritos (.subscribe) nesse metodo
  }

  private processarErroHttp(error: HttpErrorResponse){
    switch(error.status){
      case 0: 
      return this.returnError('Não foi possível conectar-se ao servidor. Verifique sua conexão e tente novamente.');
      case 401: 
        return this.returnError('Ocorreu um erro ao processar a requisição.');
      case 500: 
        return this.returnError('Usuario não encontrado, verifique a senha e o email');
      default: 
        return this.returnError(error.error?.detail || 'Erro desconhecido.');
    }
  }

  public observarToken(): Observable<string | undefined>{
    return this.tokenAutenticado.asObservable();
  }

  public registrar(user: RegisterUserVM): Observable<TokenVM>{
    return this.http.post<any>(this.endpointRegistrar, user)
      .pipe(
        map((res) => res.data),
        tap((data: TokenVM) => {
          // this.localStorageService.salvarDadosLocaisUser(dados.access_token);
          this.notificarLogin(data.access_token); 
        }),
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  public login(user: LoginUserVM): Observable<TokenVM>{
    return this.http.post<any>(this.endpointLogin, user)
      .pipe(
        map((res) => res.data),
        tap((data: TokenVM) => {
          this.localStorageService.salvarDadosLocaisUser(data);
          this.notificarLogin(data.access_token);  // <-- ADICIONAR
        }),
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  public logout(){
    this.localStorageService.limparDadosLocais();
    this.notificarLogOut(); 
  }

  public logarUsuarioSalvo(){
    const dados = this.localStorageService.obterDadosLocaisSalvos();

    if(!dados){
      return;
    }

    //Data de expiração do token
    const tokenEstaValido: boolean = new Date(dados.exp) > new Date();

    // Notificar o login
    if(tokenEstaValido){
      this.notificarLogin(dados.access_token);
    }
  }
}