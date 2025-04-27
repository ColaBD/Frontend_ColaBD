import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as joint from 'jointjs';
import * as $ from 'jquery';
import { SchemaService, TableDefinition, Relationship, RelationshipType } from '../../services/schema.service';
import { Subscription } from 'rxjs';

// Make jQuery available to JointJS
(window as any).$ = (window as any).jQuery = $;

// Extend JointJS namespace
declare module 'jointjs' {
  namespace shapes {
    namespace erp {
      class Table extends dia.Element {}
    }
  }
}

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss'
})
export class DiagramComponent implements AfterViewInit, OnDestroy {
  @ViewChild('diagram') diagramElement!: ElementRef;
  
  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;
  private currentScale: number = 1;
  private readonly minScale: number = 0.4;
  private readonly maxScale: number = 2;
  private readonly scaleStep: number = 0.1;
  private tableElementsMap = new Map<string, joint.dia.Element>();
  private relationshipLinksMap = new Map<string, joint.dia.Link>();
  private subscription: Subscription = new Subscription();
  isLinkingMode: boolean = false;
  private sourceElement: joint.dia.Element | null = null;

  constructor(private schemaService: SchemaService) { }

  ngAfterViewInit(): void {
    this.initializeJointJs();
    this.subscribeToTableChanges();
    this.subscribeToRelationshipChanges();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initializeJointJs(): void {
    this.graph = new joint.dia.Graph();
    
    this.paper = new joint.dia.Paper({
      el: this.diagramElement.nativeElement,
      model: this.graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      drawGrid: true,
      background: {
        color: '#f8f9fa'
      },
      interactive: {
        linkMove: true,
        elementMove: true,
        vertexAdd: true,
        vertexMove: true
      },
      defaultLink: this.createDefaultLink(),
      defaultConnectionPoint: { name: 'boundary' },
      validateConnection: (cellViewS: any, magnetS: any, cellViewT: any, magnetT: any, end: any, linkView: any) => {
        // Don't allow linking to self
        if (cellViewS === cellViewT) return false;
        return true;
      }
    });

    // Set paper to take available space
    const resize = () => {
      const parentWidth = this.diagramElement.nativeElement.offsetWidth;
      const parentHeight = this.diagramElement.nativeElement.offsetHeight;
      this.paper.setDimensions(parentWidth, parentHeight);
    };

    // Initial resize and add event listener
    resize();
    window.addEventListener('resize', resize);

    // Add panning
    this.setupPanning();

    // Handle element movement to update positions in the service
    this.paper.on('element:pointerup', (elementView: joint.dia.ElementView) => {
      const element = elementView.model;
      const id = element.id.toString();
      const tableId = this.getTableIdFromElementId(id);
      
      if (tableId) {
        const position = element.position();
        this.schemaService.updateTablePosition(tableId, position);
      }
    });

    // Handle relationship creation via clicks
    this.paper.on('element:pointerclick', (elementView: any, evt: any) => {
      if (this.isLinkingMode) {
        const element = elementView.model;
        
        if (!this.sourceElement) {
          // First click - select source
          this.sourceElement = element;
          element.attr('table-header/fill', '#82c8fc'); // Highlight selected
        } else if (this.sourceElement !== element) {
          // Second click - create relationship
          const sourceId = this.getTableIdFromElementId(this.sourceElement.id.toString());
          const targetId = this.getTableIdFromElementId(element.id.toString());
          
          if (sourceId && targetId) {
            // Create the relationship in the service
            this.schemaService.addRelationship({
              id: '',
              sourceTableId: sourceId,
              targetTableId: targetId,
              type: RelationshipType.OneToMany
            });
          }
          
          // Reset source and exit linking mode
          this.sourceElement.attr('table-header/fill', '#ababab'); // Remove highlight
          this.sourceElement = null;
          this.isLinkingMode = false;
        }
      }
    });

    // Handle changes to links (move vertices, etc.)
    this.paper.on('link:pointermove', (linkView: joint.dia.LinkView) => {
      // Just track changes, handled on pointerup
    });

    // Save link vertices when link manipulation finishes
    this.paper.on('link:pointerup', (linkView: joint.dia.LinkView) => {
      const link = linkView.model;
      const id = link.id.toString();
      const relationshipId = this.getRelationshipIdFromLinkId(id);
      
      if (relationshipId) {
        const vertices = link.vertices() || [];
        this.schemaService.updateRelationshipVertices(relationshipId, vertices);
      }
    });

    // Handle double-clicks on links to delete them
    this.paper.on('link:pointerdblclick', (linkView: joint.dia.LinkView) => {
      const link = linkView.model;
      const id = link.id.toString();
      const relationshipId = this.getRelationshipIdFromLinkId(id);
      
      if (relationshipId) {
        this.schemaService.removeRelationship(relationshipId);
      }
    });
  }

  private setupPanning(): void {
    let isDragging = false;
    let lastClientX = 0;
    let lastClientY = 0;
    
    // Enable panning on mousedown on blank area
    this.paper.on('blank:pointerdown', (evt: any, x: number, y: number) => {
      isDragging = true;
      if (evt.originalEvent) {
        lastClientX = evt.originalEvent.clientX || 0;
        lastClientY = evt.originalEvent.clientY || 0;
      } else {
        lastClientX = x;
        lastClientY = y;
      }
      document.body.style.cursor = 'grabbing';
    });
    
    // Disable panning on mouseup
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.cursor = 'default';
    });
    
    // Handle panning on mousemove
    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = event.clientX - lastClientX;
      const dy = event.clientY - lastClientY;
        
        const currentTranslate = this.paper.translate();
        this.paper.translate(currentTranslate.tx + dx, currentTranslate.ty + dy);
        
      lastClientX = event.clientX;
      lastClientY = event.clientY;
    });
  }

  private subscribeToTableChanges(): void {
    // Subscribe to table changes from the service
    this.subscription.add(
      this.schemaService.getTables().subscribe(tables => {
        this.updateDiagram(tables);
      })
    );
  }

  private subscribeToRelationshipChanges(): void {
    // Subscribe to relationship changes from the service
    this.subscription.add(
      this.schemaService.getRelationships().subscribe(relationships => {
        this.updateRelationships(relationships);
      })
    );
  }

  private updateDiagram(tables: TableDefinition[]): void {
    // Handle removed tables
    const currentElementIds = new Set(this.tableElementsMap.keys());
    const newTableIds = new Set(tables.map(t => t.id));
    
    // Remove tables that no longer exist
    currentElementIds.forEach(id => {
      if (!newTableIds.has(id)) {
        const element = this.tableElementsMap.get(id);
        if (element) {
          element.remove();
          this.tableElementsMap.delete(id);
        }
      }
    });

    // Add or update tables
    tables.forEach(table => {
      if (this.tableElementsMap.has(table.id)) {
        // Update existing table
        this.updateTableElement(table);
      } else {
        // Add new table
        this.addTableElement(table);
      }
    });
  }

  private updateRelationships(relationships: Relationship[]): void {
    // Handle removed relationships
    const currentLinkIds = new Set(this.relationshipLinksMap.keys());
    const newRelationshipIds = new Set(relationships.map(r => r.id));
    
    // Remove links that no longer exist
    currentLinkIds.forEach(id => {
      if (!newRelationshipIds.has(id)) {
        const link = this.relationshipLinksMap.get(id);
        if (link) {
          link.remove();
          this.relationshipLinksMap.delete(id);
        }
      }
    });

    // Add or update relationships
    relationships.forEach(relationship => {
      if (this.relationshipLinksMap.has(relationship.id)) {
        // Update existing relationship
        this.updateRelationshipLink(relationship);
      } else {
        // Add new relationship
        this.addRelationshipLink(relationship);
      }
    });
  }

  private addTableElement(table: TableDefinition): void {
    const tableElement = this.createTableElement(table);
    this.graph.addCell(tableElement);
    this.tableElementsMap.set(table.id, tableElement);
    
    // Add columns to the table
    this.addColumnsToTable(tableElement, table.columns);
  }

  private updateTableElement(table: TableDefinition): void {
    const element = this.tableElementsMap.get(table.id);
    if (!element) return;
    
    // Update table attributes
    element.attr({
      'root': {
        title: 'Tabela',
      },
      'table-header': {
        width: 200,
        height: 36,
        fill: '#ababab',
        rx: 6,  
        ry: 6
      },
      'table-body': {
        width: 200,
        height: table.columns.length * 26 + 8,
        'ref-y': 36,  
        fill: '#f5f5f5',
        rx: 6,
        ry: 6
      },
      'table-name': {
        text: table.name,   
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#303030',
        ref: 'table-header', 
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        yAlignment: 'middle',
      },
    });
    
    // Update position if needed
    if (table.position && 
       (element.position().x !== table.position.x || 
        element.position().y !== table.position.y)) {
      element.position(table.position.x, table.position.y);
    }
    
    // Update size based on columns
    element.resize(200, 44 + table.columns.length * 26);
    
    // Remove existing columns and add updated ones
    const view = this.paper.findViewByModel(element);
    if (view) {
      const columnContainer = view.findBySelector('column-container')[0];
      if (columnContainer) {
        // Clear existing columns
        while (columnContainer.firstChild) {
          columnContainer.removeChild(columnContainer.firstChild);
        }
        
        // Add updated columns
        table.columns.forEach((column, i) => {
          this.addColumnToContainer(columnContainer, column, i);
        });
      }
    }
  }

  private addRelationshipLink(relationship: Relationship): void {
    const sourceElement = this.tableElementsMap.get(relationship.sourceTableId);
    const targetElement = this.tableElementsMap.get(relationship.targetTableId);
    
    if (sourceElement && targetElement) {
      // Create the JointJS link
      const link = this.createLink(relationship);
      
      // Set source and target
      link.source({ id: sourceElement.id });
      link.target({ id: targetElement.id });
      
      // Set vertices if any
      if (relationship.vertices && relationship.vertices.length > 0) {
        link.vertices(relationship.vertices);
      }
      
      // Add to graph
      this.graph.addCell(link);
      this.relationshipLinksMap.set(relationship.id, link);
    }
  }

  private updateRelationshipLink(relationship: Relationship): void {
    const link = this.relationshipLinksMap.get(relationship.id);
    if (!link) return;
    
    // Update source and target if needed
    const sourceElement = this.tableElementsMap.get(relationship.sourceTableId);
    const targetElement = this.tableElementsMap.get(relationship.targetTableId);
    
    if (sourceElement && targetElement) {
      link.source({ id: sourceElement.id });
      link.target({ id: targetElement.id });
    }
    
    // Update vertices if any
    if (relationship.vertices) {
      link.vertices(relationship.vertices);
    }
    
    // Update relationship type (styling)
    this.updateLinkStyling(link, relationship.type);
  }

  private createTableElement(table: TableDefinition): joint.dia.Element {
    // Define table shape if not already defined
    if (!(joint.shapes as any).erp) {
      (joint.shapes as any).erp = {};
    }
    
    const Table = joint.dia.Element.define('erp.Table', {}, {
      markup: [
        { tagName: 'rect', selector: 'table-header' },
        { tagName: 'rect', selector: 'table-body' },
        { tagName: 'text', selector: 'table-name' },
        { tagName: 'g', selector: 'column-container' }
      ]
    });
    
    // Create a new table element
    const tableElement = new Table({
      id: this.getElementIdFromTableId(table.id),
      position: table.position || { x: 100, y: 100 },
      size: { width: 200, height: 44 + table.columns.length * 26 }
    });
    
    // Set table attributes
    tableElement.attr({
      'root': {
        title: 'Tabela',
        magnet: true
      },
      'table-header': {
        width: 200,
        height: 36,
        fill: '#ababab',
        rx: 6,  
        ry: 6
      },
      'table-body': {
        width: 200,
        height: table.columns.length * 26 + 8,
        'ref-y': 36,  
        fill: '#f5f5f5',
        rx: 6,
        ry: 6
      },
      'table-name': {
        text: table.name,   
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#303030',
        ref: 'table-header', 
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        yAlignment: 'middle',
      },
    });
    
    return tableElement;
  }

  private createLink(relationship: Relationship): joint.dia.Link {
    // Create new link with custom styling based on relationship type
    const link = new joint.dia.Link({
      id: this.getLinkIdFromRelationshipId(relationship.id),
      z: -1, // Display below elements
      attrs: {
        '.connection': {
          stroke: '#444',
          'stroke-width': 2,
          'pointer-events': 'stroke'
        },
        '.marker-source': {
          d: 'M 10 0 L 0 5 L 10 10 z',
          fill: '#444',
          stroke: 'none'
        },
        '.marker-target': {
          d: 'M 10 0 L 0 5 L 10 10 z',
          fill: '#444',
          stroke: 'none'
        }
      },
      router: { name: 'manhattan' },
      connector: { name: 'rounded' }
    });
    
    // Apply specific styling based on relationship type
    this.updateLinkStyling(link, relationship.type);
    
    return link;
  }

  private createDefaultLink(): joint.dia.Link {
    // Default link when creating links interactively
    return new joint.dia.Link({
      attrs: {
        '.connection': {
          stroke: '#444',
          'stroke-width': 2,
          'pointer-events': 'stroke'
        },
        '.marker-target': {
          d: 'M 10 0 L 0 5 L 10 10 z',
          fill: '#444',
          stroke: 'none'
        }
      },
      router: { name: 'manhattan' },
      connector: { name: 'rounded' }
    });
  }

  private updateLinkStyling(link: joint.dia.Link, type: RelationshipType): void {
    switch (type) {
      case RelationshipType.OneToOne:
        // One straight line on each end
        link.attr({
          '.marker-source': {
            d: 'M 0 5 L 10 5',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          },
          '.marker-target': {
            d: 'M 0 5 L 10 5',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          }
        });
        break;
      
      case RelationshipType.OneToMany:
        // One straight line at source, crow's foot at target
        link.attr({
          '.marker-source': {
            d: 'M 0 5 L 10 5',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          },
          '.marker-target': {
            d: 'M 0 0 L 10 5 L 0 10',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          }
        });
        break;
      
      case RelationshipType.ManyToOne:
        // Crow's foot at source, one straight line at target
        link.attr({
          '.marker-source': {
            d: 'M 0 0 L 10 5 L 0 10',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          },
          '.marker-target': {
            d: 'M 0 5 L 10 5',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          }
        });
        break;
      
      case RelationshipType.ManyToMany:
        // Crow's foot at both ends
        link.attr({
          '.marker-source': {
            d: 'M 0 0 L 10 5 L 0 10',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          },
          '.marker-target': {
            d: 'M 0 0 L 10 5 L 0 10',
            fill: 'none',
            stroke: '#444',
            'stroke-width': 2
          }
        });
        break;
    }
  }

  private addColumnsToTable(tableElement: joint.dia.Element, columns: any[]): void {
    const view = this.paper.findViewByModel(tableElement);
    if (!view) return;
    
    const columnContainer = view.findBySelector('column-container')[0];
    if (!columnContainer) return;
    
    columns.forEach((column, i) => {
      this.addColumnToContainer(columnContainer, column, i);
    });
  }

  private addColumnToContainer(container: SVGElement, column: any, index: number): void {
    // Create circle bullet
    const bullet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bullet.setAttribute('cx', '16');
    bullet.setAttribute('cy', (46 + index * 26).toString());
    bullet.setAttribute('r', '4');
    bullet.setAttribute('fill', '#3498db');
    container.appendChild(bullet);
    
    // Create column name
    const columnName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    columnName.setAttribute('class', 'column-name');
    columnName.setAttribute('x', '30');
    columnName.setAttribute('y', (50 + index * 26).toString());
    columnName.setAttribute('font-size', '12');
    columnName.setAttribute('font-family', 'Arial, sans-serif');
    columnName.setAttribute('fill', '#333333');
    columnName.textContent = column.name;
    container.appendChild(columnName);
    
    // Create column type (right-aligned)
    if (column.type) {
      const columnType = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      columnType.setAttribute('class', 'column-type');
      columnType.setAttribute('x', '180');
      columnType.setAttribute('y', (50 + index * 26).toString());
      columnType.setAttribute('font-size', '12');
      columnType.setAttribute('font-family', 'Arial, sans-serif');
      columnType.setAttribute('fill', '#777777');
      columnType.setAttribute('text-anchor', 'end');
      columnType.textContent = column.type;
      container.appendChild(columnType);
    }
  }

  // Helper methods for mapping between IDs
  private getElementIdFromTableId(tableId: string): string {
    return `element_${tableId}`;
  }

  private getTableIdFromElementId(elementId: string): string {
    if (elementId.startsWith('element_')) {
      return elementId.substring(8);
    }
    return '';
  }

  private getLinkIdFromRelationshipId(relationshipId: string): string {
    return `link_${relationshipId}`;
  }

  private getRelationshipIdFromLinkId(linkId: string): string {
    if (linkId.startsWith('link_')) {
      return linkId.substring(5);
    }
    return '';
  }

  // Public methods exposed to the template
  
  toggleLinkingMode(): void {
    // If already in linking mode, cancel it
    if (this.isLinkingMode && this.sourceElement) {
      this.sourceElement.attr('table-header/fill', '#ababab'); // Remove highlight
      this.sourceElement = null;
    }
    
    // Toggle the mode
    this.isLinkingMode = !this.isLinkingMode;
  }

  zoomIn(): void {
    if (this.currentScale < this.maxScale) {
      this.currentScale += this.scaleStep;
      this.paper.scale(this.currentScale);
    }
  }

  zoomOut(): void {
    if (this.currentScale > this.minScale) {
      this.currentScale -= this.scaleStep;
      this.paper.scale(this.currentScale);
    }
  }

  fitContent(): void {
    this.paper.scaleContentToFit({
      padding: 50,
      minScale: this.minScale,
      maxScale: this.maxScale
    });
    this.currentScale = this.paper.scale().sx;
  }
} 