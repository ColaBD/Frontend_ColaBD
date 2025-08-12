import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, map, throwError } from "rxjs";
import { LocalStorageService } from "../../../core/auth/services/local-storage.service";
import { 
  SchemasListResponse, 
  SchemaByIdResponse, 
  SchemaListItem, 
  SchemaDetailsResponse,
  SchemaApiResponse,
  SchemaCreateApiResponse 
} from "../models/schema-api.models";

@Injectable({
  providedIn: 'root'
})
export class SchemaApiService {
  private endpoint: string = 'http://127.0.0.1:8000/';
  private endpointSchemas: string = this.endpoint + 'schemas';

  constructor(
    private http: HttpClient, 
    private localStorageService: LocalStorageService
  ) {}

  private returnError(msgErro: string) {
    return throwError(() => new Error(msgErro));
  }

  private processarErroHttp(error: HttpErrorResponse) {
    switch(error.status) {
      case 0: 
        return this.returnError('Não foi possível conectar-se ao servidor. Verifique sua conexão e tente novamente.');
      case 401: 
        return this.returnError('Não autorizado. Faça login novamente.');
      case 403:
        return this.returnError('Acesso negado. Você não tem permissão para acessar este recurso.');
      case 404:
        return this.returnError('Schema não encontrado.');
      case 500: 
        return this.returnError('Erro interno do servidor. Tente novamente mais tarde.');
      default: 
        return this.returnError(error.error?.message || 'Erro desconhecido');
    }
  }

  private obterHeadersAutorizacao() {
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;

    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  private obterHeadersAutorizacaoMultipart() {
    const token = this.localStorageService.obterDadosLocaisSalvos()?.access_token;

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type for multipart/form-data, let browser set it with boundary
      }),
    };
  }

  /**
   * Get all schemas for the authenticated user
   */
  public getAllSchemas(): Observable<SchemaListItem[]> {
    return this.http.get<SchemasListResponse>(this.endpointSchemas, this.obterHeadersAutorizacao())
      .pipe(
        map((response) => response.data),
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  /**
   * Get schema by ID
   */
  public getSchemaById(schemaId: string): Observable<SchemaDetailsResponse> {
    const url = `${this.endpointSchemas}/${schemaId}`;
    return this.http.get<SchemaByIdResponse>(url, this.obterHeadersAutorizacao())
      .pipe(
        map((response) => response.data),
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  /**
   * Create a new schema using POST /schemas endpoint
   */
  public createSchema(title: string): Observable<{id: string, title: string}> {
    const requestBody = {
      title: title
    };
    
    return this.http.post<SchemaCreateApiResponse>(this.endpointSchemas, requestBody, this.obterHeadersAutorizacao())
      .pipe(
        map((response) => {
          console.log('Create schema API response:', response);
          // Return schema with id and title for navigation
          return {
            id: response.data.schema_id,
            title: response.data.title
          };
        }),
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  /**
   * Save schema using PUT /schemas endpoint with multipart/form-data
   */
  public saveSchema(schemaId: string, cells: any[], displayPicture?: Blob): Observable<{ success: boolean, message: string }> {
    const formData = new FormData();
    
    // Add schema_id
    formData.append('schema_id', schemaId);
    
    // Add cells as JSON string
    formData.append('cells', JSON.stringify(cells));
    
    // Add display_picture if provided
    if (displayPicture) {
      formData.append('display_picture', displayPicture, 'image.png');
    }
    
    return this.http.put<{ success: boolean, message: string }>(this.endpointSchemas, formData, this.obterHeadersAutorizacaoMultipart())
      .pipe(
        catchError((err: HttpErrorResponse) => this.processarErroHttp(err))
      );
  }

  /**
   * Convert canvas to blob for image upload
   */
  public canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png', 0.9);
    });
  }
} 