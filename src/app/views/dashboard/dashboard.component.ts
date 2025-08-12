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
import { CreateSchemaModalComponent } from '../../shared/components/create-schema-modal/create-schema-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  schemas: SchemaListItem[] = [];
  isLoading = false;
  error: string | null = null;
  activeMenuId: string | null = null;

  constructor(
    private footerService: FooterService,
    private schemaApiService: SchemaApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}
  
  ngOnInit() {
    this.footerService.setFooterVisibility(false);
    this.loadSchemas();
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true);
  }

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

  // Make loadSchemas public so it can be called from template
  public retryLoadSchemas() {
    this.loadSchemas();
  }

  onSchemaClick(schema: SchemaListItem) {
    // Navigate to schema editor with the specific schema ID
    console.log('Navigating to schema:', schema.id);
    this.router.navigate(['/schema', schema.id]);
  }

  onCreateNewSchema() {
    // Open modal to get schema title
    const dialogRef = this.dialog.open(CreateSchemaModalComponent, {
      width: '450px',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(title => {
      console.log('Modal closed with title:', title);
      if (title) {
        this.createNewSchema(title);
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
          
          // Fallback: reload the dashboard to show the new schema
          this.loadSchemas();
        }
      },
      error: (error) => {
        this.error = `Falha ao criar schema: ${error.message}`;
        this.isLoading = false;
        console.error('Error creating schema:', error);
      }
    });
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
    // Priority order: signed_image_url, display_picture, fallback to placeholder
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

  private closeMenuOnOutsideClick() {
    this.activeMenuId = null;
  }

  duplicateSchema(schema: SchemaListItem) {
    this.activeMenuId = null;
    console.log('Duplicating schema:', schema);
    // TODO: Implement duplicate functionality
    alert('Funcionalidade de duplicar em desenvolvimento');
  }

  deleteSchema(schema: SchemaListItem) {
    this.activeMenuId = null;
    if (confirm(`Tem certeza que deseja excluir o schema "${schema.title}"?`)) {
      console.log('Deleting schema:', schema);
      // TODO: Implement delete functionality
      alert('Funcionalidade de excluir em desenvolvimento');
    }
  }
}
