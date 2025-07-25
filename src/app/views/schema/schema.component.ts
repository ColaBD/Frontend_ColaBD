import { Component, OnDestroy } from '@angular/core';
import { FooterService } from '../../core/footer/services/footer.service';
import { HighlightModule } from 'ngx-highlightjs';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from "./component/code-editor/code-editor.component";
import { TableEditorComponent } from './component/table-editor/table-editor.component';
import { DiagramComponent } from './component/diagram/diagram.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

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
export class SchemaComponent implements OnDestroy {
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

  constructor(private footerService: FooterService) { }

  ngOnInit() {
    this.footerService.setFooterVisibility(false); //adicionar isso para esconder o footer
    this.initializeResizablePanels();
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
}
