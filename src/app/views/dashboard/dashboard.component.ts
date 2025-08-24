import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FooterService } from '../../core/footer/services/footer.service';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { SchemaApiService } from '../schema/services/schema-api.service';
import { SchemaListItem } from '../schema/models/schema-api.models';
import { SchemaNewTitleComponent } from '../../shared/components/schema-new-title/schema-new-title.component';
import { ToastrService } from 'ngx-toastr';
import { LocalStorageService } from '../../core/auth/services/local-storage.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  schemas: SchemaListItem[] = [];
  isLoading = false;
  error: string | null = null;
  activeMenuId: string | null = null;
  userName: string = ''; 

  constructor(
    private footerService: FooterService,
    private schemaApiService: SchemaApiService,
    private router: Router,
    private dialog: MatDialog,
    private toastrService: ToastrService,
    private localStorageService: LocalStorageService
  ) {}

  private loadSchemas() {
    this.isLoading = true;
    this.error = null;

    this.schemaApiService.getAllSchemas().subscribe({
      next: (schemas) => {
        this.schemas = schemas;
        this.isLoading = false;
        console.log('Schemas loaded:', schemas);
      },
      error: (error) => {
        this.error = error.message;
        this.isLoading = false;
        console.error('Error loading schemas:', error);
      }
    });
  }

  private refreshDashboardSchemas(schemaId: string) {
    this.schemas = this.schemas.filter(s => s.id !== schemaId);
  }

  private newTitleSchema(isUpdate: boolean, schema: SchemaListItem | null = null) {
    const dialogRef = this.dialog.open(SchemaNewTitleComponent, {
      width: '450px',
      disableClose: false,
      autoFocus: true,
      data: { isUpdate: isUpdate }
    });

    dialogRef.afterClosed().subscribe(title => {
      if(!title) {
        return;
      }

      if(isUpdate && schema) {
        this.updateSchemaName(schema.id, title);
        return;
      }

      this.createNewSchema(title);
    });
  }

  private updateSchemaName(schemaId: string, newTitle: string) {
    this.schemaApiService.updateSchemaTitle(schemaId, newTitle).subscribe({
      next: () => {
        this.toastrService.success('Nome do schema atualizado com sucesso');
        this.refreshDashboardSchemas(schemaId);
      },
      error: (error) => {
        this.toastrService.error(`Erro ao atualizar nome do schema`);
        console.error('Error updating schema name:', error);
      }
    });
  }

  private createNewSchema(title: string) {
    console.log('Creating new schema with title:', title);
    this.isLoading = true;
    this.error = null;

    this.schemaApiService.createSchema(title).subscribe({
      next: (newSchema) => {
        console.log('Schema created successfully:', newSchema);
        this.isLoading = false;
        
        if (newSchema && newSchema.id) {
          this.router.navigate(['/schema', newSchema.id]);
        } else {
          console.error('Created schema does not have a valid ID:', newSchema);
          this.error = 'Schema criado, mas não foi possível obter o ID para navegação';

          this.refreshDashboardSchemas(newSchema.id);
        }
      },
      error: (error) => {
        this.error = `Falha ao criar schema: ${error.message}`;
        this.isLoading = false;
        console.error('Error creating schema:', error);
      }
    });
  }

  private closeMenuOnOutsideClick() {
    this.activeMenuId = null;
  }
  
  ngOnInit() {
    const tokenData = this.localStorageService.obterDadosLocaisSalvos();
    if (tokenData) {
      const decoded: any = jwtDecode(tokenData.access_token);
      this.userName = decoded['email'].split('@')[0] || 'Usuário';
    }

    this.footerService.setFooterVisibility(false);
    this.loadSchemas();
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true);
  }

  retryLoadSchemas() {
    this.loadSchemas();
  }

  onSchemaClick(schema: SchemaListItem) {
    this.router.navigate(['/schema', schema.id]);
  }

  onUpdateSchemaName(schema: SchemaListItem){
    this.newTitleSchema(true, schema);
  }

  onCreateNewSchema() {
    this.newTitleSchema(false);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) {
      return 'Data não disponível';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  }

  getSchemaImageUrl(schema: SchemaListItem): string {
    if (schema.signed_image_url) {
      return schema.signed_image_url;
    }
    
    if (schema.display_picture) {
      return schema.display_picture;
    }
    
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04NS4zMzMzIDQ1Ljc1TDEwMC42NjcgNjEuMDgzM0wxMTYgNDUuNzVMMTQxLjMzMyA3MS4wODMzSDE1OC42NjdWODguNDE2N0g0MS4zMzMzVjcxLjA4MzNMNjAuNjY2NyA1MS43NUw4NS4zMzMzIDQ1Ljc1WiIgZmlsbD0iIzZDNzU3RCIvPgo8Y2lyY2xlIGN4PSI3NS4zMzMzIiBjeT0iNTQuNDE2NyIgcj0iOC4zMzMzMyIgZmlsbD0iIzZDNzU3RCIvPgo8L3N2Zz4K';
  }

  onImageError(event: any) {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04NS4zMzMzIDQ1Ljc1TDEwMC42NjcgNjEuMDgzM0wxMTYgNDUuNzVMMTQxLjMzMyA3MS4wODMzSDE1OC42NjdWODguNDE2N0g0MS4zMzMzVjcxLjA4MzNMNjAuNjY2NyA1MS43NUw4NS4zMzMzIDQ1Ljc1WiIgZmlsbD0iIzZDNzU3RCIvPgo8Y2lyY2xlIGN4PSI3NS4zMzMzIiBjeT0iNTQuNDE2NyIgcj0iOC4zMzMzMyIgZmlsbD0iIzZDNzU3RCIvPgo8L3N2Zz4K';
    event.target.alt = 'Imagem não disponível';
  }

  toggleSchemaMenu(event: Event, schemaId: string) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === schemaId ? null : schemaId;
    
    if (this.activeMenuId) {
      setTimeout(() => {
        document.addEventListener('click', this.closeMenuOnOutsideClick.bind(this), { once: true });
      }, 0);
    }
  }

  duplicateSchema(schema: SchemaListItem) {
    this.activeMenuId = null;
    console.log('Duplicating schema:', schema);
    alert('Funcionalidade de duplicar em desenvolvimento');
  }

  deleteSchema(schema: SchemaListItem) {
    this.activeMenuId = null;

    if (confirm(`Tem certeza que deseja excluir o schema "${schema.title}"?`)) {
      this.schemaApiService.deleteSchema(schema.id).subscribe({
        next: () => {
          this.toastrService.success('Schema excluído com sucesso');
          this.refreshDashboardSchemas(schema.id);
          
        },
        error: (error) => {
          console.error('Error deleting schema:', error);
          this.toastrService.error(`Erro ao excluir schema`);
        }
      });
    }
  }
}
