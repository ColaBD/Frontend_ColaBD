import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, throwError } from 'rxjs';
import { LocalStorageService } from '../../../core/auth/services/local-storage.service';

export interface SchemaVersion {
  id: string;
  timestamp: Date;
  author: string;
  comment?: string;
  data: any; // JointJS graph data
  isCurrent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VersionControlService {
  private versions: SchemaVersion[] = [];
  private versionsSubject = new BehaviorSubject<SchemaVersion[]>([]);
  private currentVersionId: string | null = null;
  private currentSchemaId: string | null = null;

  // TODO: centralizar base URL em um único serviço/config
  // Backend de versões exposto em http://localhost:8000/versions (sem barra final)
  private readonly apiBaseUrl = 'http://localhost:8000';
  private readonly versionsEndpoint = `${this.apiBaseUrl}/versions`;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {}

  /**
   * Get versions as observable
   */
  getVersions(): Observable<SchemaVersion[]> {
    return this.versionsSubject.asObservable();
  }

  /**
   * Get versions snapshot
   */
  getVersionsSnapshot(): SchemaVersion[] {
    return [...this.versions];
  }

  /**
   * Save a new version
   */
  saveVersion(data: any, author: string, comment?: string): Observable<SchemaVersion> {
    if (!this.currentSchemaId) {
      return throwError(() => new Error('Schema ID não definido para versionamento'));
    }

    const body = {
      schema_id: this.currentSchemaId,
      comment: comment || null,
      data,
    };

    return this.http.post<any>(this.versionsEndpoint, body, this.getAuthOptions()).pipe(
      map((response) => {
        // A API retorna apenas metadados básicos; completamos os campos com os dados atuais
        const versionId = response?.data?.version_id || this.generateId();

        // Marcar versões anteriores como não atuais
        this.versions.forEach(v => v.isCurrent = false);

        const newVersion: SchemaVersion = {
          id: versionId,
          timestamp: new Date(),
          author,
          comment: comment || undefined,
          data: JSON.parse(JSON.stringify(data)),
          isCurrent: true,
        };

        this.versions.unshift(newVersion);
        this.currentVersionId = newVersion.id;

        // Manter apenas as últimas 50 versões por schema
        if (this.versions.length > 50) {
          this.versions = this.versions.slice(0, 50);
        }

        this.saveVersionsToStorage();
        this.versionsSubject.next([...this.versions]);

        return newVersion;
      }),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  /**
   * Get a specific version by ID
   */
  getVersion(versionId: string): SchemaVersion | null {
    return this.versions.find(v => v.id === versionId) || null;
  }

  /**
   * Restore a version (mark it as current)
   */
  restoreVersion(versionId: string): SchemaVersion | null {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) {
      return null;
    }

    // Mark all versions as not current
    this.versions.forEach(v => v.isCurrent = false);

    // Mark the restored version as current
    version.isCurrent = true;
    this.currentVersionId = versionId;

    this.saveVersionsToStorage();
    this.versionsSubject.next([...this.versions]);

    return version;
  }

  /**
   * Delete a version
   */
  deleteVersion(versionId: string): boolean {
    const index = this.versions.findIndex(v => v.id === versionId);
    if (index === -1) {
      return false;
    }

    // Don't allow deleting the current version
    if (this.versions[index].isCurrent) {
      return false;
    }

    this.versions.splice(index, 1);
    this.saveVersionsToStorage();
    this.versionsSubject.next([...this.versions]);

    return true;
  }

  /**
   * Get current version
   */
  getCurrentVersion(): SchemaVersion | null {
    return this.versions.find(v => v.isCurrent) || null;
  }

  /**
   * Clear all versions
   */
  clearVersions(): void {
    this.versions = [];
    this.currentVersionId = null;
    this.saveVersionsToStorage();
    this.versionsSubject.next([]);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save versions to localStorage
   */
  private saveVersionsToStorage(): void {
    try {
      const schemaId = this.getSchemaIdFromUrl();
      if (schemaId) {
        const key = `schema_versions_${schemaId}`;
        localStorage.setItem(key, JSON.stringify(this.versions));
      }
    } catch (error) {
      console.error('Error saving versions to storage:', error);
    }
  }

  /**
   * Load versions from localStorage
   */
  private loadVersionsFromStorage(): void {
    try {
      const schemaId = this.getSchemaIdFromUrl();
      if (schemaId) {
        const key = `schema_versions_${schemaId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          this.versions = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          this.versions.forEach(v => {
            v.timestamp = new Date(v.timestamp);
          });
          this.versionsSubject.next([...this.versions]);
          
          // Set current version ID
          const currentVersion = this.versions.find(v => v.isCurrent);
          if (currentVersion) {
            this.currentVersionId = currentVersion.id;
          }
        }
      }
    } catch (error) {
      console.error('Error loading versions from storage:', error);
      this.versions = [];
    }
  }

  /**
   * Get schema ID from current URL
   */
  private getSchemaIdFromUrl(): string | null {
    const match = window.location.pathname.match(/\/schema\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Set schema ID manually (for initialization)
   */
  setSchemaId(schemaId: string): void {
    this.currentSchemaId = schemaId;

    this.loadVersionsFromBackend(schemaId).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error loading versions from backend:', error);
        this.versions = [];
        this.versionsSubject.next([]);
      },
    });
  }

  /**
   * Load versions from backend for a given schema
   */
  private loadVersionsFromBackend(schemaId: string): Observable<SchemaVersion[]> {
    const url = `${this.versionsEndpoint}/schema/${schemaId}`;

    return this.http.get<any>(url, this.getAuthOptions()).pipe(
      map((response) => {
        const items: any[] = response?.data || [];

        const mapped: SchemaVersion[] = items.map((item, index) => {
          const version = item.version || item;
          const createdAt = version.created_at || version.createdAt || new Date().toISOString();

          return {
            id: version.id || item.version_id,
            timestamp: new Date(createdAt),
            author: version.created_by || 'Usuário',
            comment: version.comment || undefined,
            data: version.data,
            isCurrent: index === 0,
          };
        });

        this.versions = mapped;
        this.currentVersionId = mapped[0]?.id || null;
        this.versionsSubject.next([...this.versions]);

        return mapped;
      }),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  /**
   * Build auth headers with bearer token
   */
  private getAuthOptions() {
    const token = this.localStorageService.getToken();

    return {
      headers: new HttpHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  /**
   * Centralized HTTP error handling
   */
  private handleHttpError(error: HttpErrorResponse) {
    // Mapeamento simples de erros – mensagens mais detalhadas podem ser adicionadas depois
    let message = 'Erro ao comunicar com o servidor de versões.';

    if (error.status === 403) {
      message = 'Você não tem permissão para acessar as versões deste schema.';
    } else if (error.status === 404) {
      message = 'Schema não encontrado para versionamento.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Erro ao criar versão.';
    }

    return throwError(() => new Error(message));
  }
}






