import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FooterService } from '../../core/footer/services/footer.service';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { SchemaApiService } from '../schema/services/schema-api.service';
import { SchemaListItem } from '../schema/models/schema-api.models';

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

  constructor(
    private footerService: FooterService,
    private schemaApiService: SchemaApiService,
    private router: Router
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
    console.log('Navigating to schema:', schema.schema_id);
    this.router.navigate(['/schema', schema.schema_id]);
  }

  onCreateNewSchema() {
    // Navigate to create new schema
    console.log('Create new schema clicked');
    this.router.navigate(['/schema']);
  }
}
