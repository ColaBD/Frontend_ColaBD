import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FooterService } from '../../core/footer/services/footer.service';
import { HighlightModule } from 'ngx-highlightjs';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from "./component/code-editor/code-editor.component";
import { TableEditorComponent } from './component/table-editor/table-editor.component';
import { DiagramComponent } from './component/diagram/diagram.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { SchemaService } from './services/schema.service';
import { SchemaBackendService } from './services/schema-backend.service';

@Component({
  selector: 'app-schema',
  imports: [
    CommonModule,
    HighlightModule, 
    FormsModule, 
    CodeEditorComponent, 
    TableEditorComponent, 
    DiagramComponent,
    MatIconModule, 
    MatButtonModule
  ],
  templateUrl: './schema.component.html',
  styleUrl: './schema.component.scss',
})
export class SchemaComponent implements OnInit, OnDestroy {
  @ViewChild(DiagramComponent) diagramComponent!: DiagramComponent;
  
  activeEditor: 'table' | 'code' = 'table';
  
  // Resizable panel properties
  editorWidth: number = 600; // Default width
  diagramWidth: number = 600; // Default width
  isResizing: boolean = false;
  private startX: number = 0;
  private startEditorWidth: number = 0;
  private containerWidth: number = 0;
  
  // Store bound functions for proper cleanup
  private boundUpdatePanelSizes = this.updatePanelSizes.bind(this);
  private boundOnResize = this.onResize.bind(this);
  private boundOnResizeEnd = this.onResizeEnd.bind(this);

  // Schema loading state
  isLoadingSchema = false;
  schemaLoadError: string | null = null;

  // Schema saving state
  isSavingSchema = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;

  // Current schema ID from route
  currentSchemaId: string | null = null;

  constructor(
    private footerService: FooterService,
    private route: ActivatedRoute,
    private schemaService: SchemaService,
    private schemaBackendService: SchemaBackendService
  ) { }

  ngOnInit() {
    this.footerService.setFooterVisibility(false);
    this.initializeResizablePanels();
    this.loadSchemaFromRoute();
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true); //adicionar isso para voltar a aparecer o footer
    
    // Clean up event listeners
    window.removeEventListener('resize', this.boundUpdatePanelSizes);
    document.removeEventListener('mousemove', this.boundOnResize);
    document.removeEventListener('mouseup', this.boundOnResizeEnd);
  }

  setActiveEditor(editor: 'table' | 'code') {
    this.activeEditor = editor;
  }

  // Resizable panel methods
  private initializeResizablePanels() {
    // Initialize panel sizes based on window width
    this.updatePanelSizes();
    
    // Add window resize listener
    window.addEventListener('resize', this.boundUpdatePanelSizes);
    
    // Add global mouse event listeners for resizing
    document.addEventListener('mousemove', this.boundOnResize);
    document.addEventListener('mouseup', this.boundOnResizeEnd);
  }

  private updatePanelSizes() {
    // Get container width (assuming full window width minus some padding)
    this.containerWidth = window.innerWidth;
    
    // Set default widths if not already set
    if (this.editorWidth === 600 && this.diagramWidth === 600) {
      // Try to load from localStorage first
      const savedEditorWidth = localStorage.getItem('schema-editor-width');
      if (savedEditorWidth) {
        this.editorWidth = parseInt(savedEditorWidth, 10);
      } else {
        this.editorWidth = Math.floor(this.containerWidth * 0.4); // 40% for editor
      }
      this.diagramWidth = this.containerWidth - this.editorWidth - 6; // Rest for diagram minus handle width
    } else {
      // Maintain proportions when window resizes
      this.diagramWidth = this.containerWidth - this.editorWidth - 6;
    }
  }

  onResizeStart(event: MouseEvent) {
    this.isResizing = true;
    this.startX = event.clientX;
    this.startEditorWidth = this.editorWidth;
    event.preventDefault();
  }

  private onResize(event: MouseEvent) {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.startX;
    const newEditorWidth = this.startEditorWidth + deltaX;
    
    // Set minimum and maximum widths
    const minWidth = 300;
    const maxWidth = this.containerWidth - 300; // Leave at least 300px for diagram
    
    if (newEditorWidth >= minWidth && newEditorWidth <= maxWidth) {
      this.editorWidth = newEditorWidth;
      this.diagramWidth = this.containerWidth - this.editorWidth - 6; // 6px for handle
    }
  }

  private onResizeEnd() {
    this.isResizing = false;
    
    // Save the current editor width to localStorage
    localStorage.setItem('schema-editor-width', this.editorWidth.toString());
  }

  private loadSchemaFromRoute() {
    const schemaId = this.route.snapshot.paramMap.get('id');
    if (schemaId) {
      console.log('Loading schema with ID:', schemaId);
      this.currentSchemaId = schemaId; // Store the current schema ID
      this.isLoadingSchema = true;
      this.schemaLoadError = null;
      
      // Get the raw API response with cells
      this.schemaBackendService.getSchemaDetails(schemaId).subscribe({
        next: (response) => {
          console.log('Raw API response:', response);
          
          // Build JointJS graph object from the cells array
          const jointjsGraph = {
            cells: response.cells || []
          };
          
          console.log('Built JointJS graph:', jointjsGraph);
          
          // Set loading to false first so the diagram component gets rendered
          this.isLoadingSchema = false;
          
          // Use setTimeout to ensure the diagram component is initialized after the template updates
          setTimeout(() => {
            if (this.diagramComponent) {
              // Clear existing data first
              this.diagramComponent.clearDiagram();
              
              // Then load the new data
              this.diagramComponent.loadFromJointJSData(jointjsGraph);
              console.log('Schema loaded successfully into diagram');
            } else {
              console.error('Diagram component not available');
              this.schemaLoadError = 'Failed to initialize diagram component';
            }
          }, 100);
        },
        error: (error: any) => {
          this.schemaLoadError = `Error loading schema: ${error.message}`;
          console.error('Error loading schema:', error);
          this.isLoadingSchema = false;
        }
      });
    }
  }

  /**
   * Save the current schema with canvas image
   */
  async saveSchema(): Promise<void> {
    if (!this.currentSchemaId) {
      console.error('No schema ID available for saving');
      this.saveError = 'No schema ID available for saving';
      return;
    }

    this.isSavingSchema = true;
    this.saveError = null;
    this.saveSuccess = false;

    try {
      // Try to get canvas from diagram component
      let canvas: HTMLCanvasElement | null = null;
      if (this.diagramComponent) {
        canvas = await this.diagramComponent.getCanvasForSave();
      }

      // Get current schema data from the service and save with canvas
      this.schemaService.saveSchemaToBackend(this.currentSchemaId, canvas || undefined).subscribe({
        next: (response) => {
          console.log('Schema saved successfully:', response);
          this.isSavingSchema = false;
          this.saveSuccess = true;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        },
        error: (error: any) => {
          console.error('Error saving schema:', error);
          this.saveError = `Error saving schema: ${error.message}`;
          this.isSavingSchema = false;
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.saveError = null;
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Error capturing canvas:', error);
      // Fallback: save without canvas
      this.schemaService.saveSchemaToBackend(this.currentSchemaId).subscribe({
        next: (response) => {
          console.log('Schema saved successfully (without image):', response);
          this.isSavingSchema = false;
          this.saveSuccess = true;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        },
        error: (error: any) => {
          console.error('Error saving schema:', error);
          this.saveError = `Error saving schema: ${error.message}`;
          this.isSavingSchema = false;
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.saveError = null;
          }, 5000);
        }
      });
    }
  }
}
