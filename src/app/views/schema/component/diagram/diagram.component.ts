import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as joint from 'jointjs';
import * as $ from 'jquery';

// Make jQuery available to JointJS
(window as any).$ = (window as any).jQuery = $;

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss'
})
export class DiagramComponent implements AfterViewInit {
  @ViewChild('diagram') diagramElement!: ElementRef;
  
  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;
  private currentScale: number = 1;
  private readonly minScale: number = 0.4;
  private readonly maxScale: number = 2;
  private readonly scaleStep: number = 0.1;

  constructor() { }

  ngAfterViewInit(): void {
    this.initializeJointJs();
    this.createSampleDiagram();
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
        vertexAdd: false
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
    this.enablePanning();
  }

  private enablePanning(): void {
    let dragStartPosition: { x: number, y: number } | null = null;
    
    this.paper.on('blank:pointerdown', (evt: any, x: number, y: number) => {
      dragStartPosition = { x, y };
      this.paper.el.style.cursor = 'grabbing';
    });

    this.paper.on('blank:pointermove', (evt: any, x: number, y: number) => {
      if (dragStartPosition) {
        const dx = x - dragStartPosition.x;
        const dy = y - dragStartPosition.y;
        
        const currentTranslate = this.paper.translate();
        this.paper.translate(currentTranslate.tx + dx, currentTranslate.ty + dy);
        
        dragStartPosition = { x, y };
      }
    });

    this.paper.on('blank:pointerup', () => {
      dragStartPosition = null;
      this.paper.el.style.cursor = 'default';
    });
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

  private createSampleDiagram(): void {
    // Define table shapes
    const Table = joint.dia.Element.define('erp.Table', {
      attrs: {
        '.': { magnet: false },
        '.table-header': {
          fill: '#15303a',
          stroke: '#15303a',
          strokeWidth: 1,
          height: 30,
          'pointer-events': 'none'
        },
        '.table-body': {
          fill: '#ffffff',
          stroke: '#15303a',
          strokeWidth: 1,
          'pointer-events': 'none'
        },
        '.table-name': {
          'font-size': 12,
          'font-family': 'Arial',
          'font-weight': 'bold',
          fill: '#ffffff',
          'text-anchor': 'middle',
          'ref-x': .5,
          'ref-y': 15,
          'y-alignment': 'middle',
          'pointer-events': 'none'
        },
        '.column-container': {
          'pointer-events': 'none'
        },
        '.column': {
          'font-size': 11,
          'font-family': 'Arial',
          fill: '#333333',
          'ref-x': 10,
          'pointer-events': 'none'
        }
      }
    }, {
      markup: [
        { tagName: 'rect', selector: 'table-header' },
        { tagName: 'rect', selector: 'table-body' },
        { tagName: 'text', selector: 'table-name' },
        { tagName: 'g', selector: 'column-container' }
      ]
    });

    // Create tables
    const createTable = (name: string, columns: string[], position: { x: number, y: number }): joint.dia.Element => {
      const table = new Table({
        position,
        size: { width: 180, height: 30 + columns.length * 20 }
      });
      
      table.attr({
        'table-header': { width: 180, height: 30 },
        'table-body': { width: 180, height: columns.length * 20, 'ref-y': 30 },
        'table-name': { text: name }
      });

      // Add columns
      const columnContainer = table.findView(this.paper)?.findBySelector('column-container')[0];
      if (columnContainer) {
        columns.forEach((column, i) => {
          const columnText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          columnText.setAttribute('class', 'column');
          columnText.setAttribute('y', (30 + i * 20 + 15).toString());
          columnText.textContent = column;
          columnContainer.appendChild(columnText);
        });
      }

      return table;
    };

    // Sample tables
    const table1 = createTable('Customers', [
      'id_customer (PK)',
      'name',
      'email',
      'phone'
    ], { x: 100, y: 100 });

    const table2 = createTable('Orders', [
      'id_order (PK)',
      'id_customer (FK)',
      'order_date',
      'total'
    ], { x: 400, y: 100 });

    const table3 = createTable('Products', [
      'id_product (PK)',
      'name',
      'price',
      'description'
    ], { x: 700, y: 100 });

    const table4 = createTable('Order_Items', [
      'id_order_item (PK)',
      'id_order (FK)',
      'id_product (FK)',
      'quantity',
      'price'
    ], { x: 550, y: 300 });

    // Add tables to graph
    this.graph.addCells([table1, table2, table3, table4]);

    // Create relationships
    const link1 = new joint.shapes.standard.Link({
      source: { id: table1.id, anchor: { name: 'right' } },
      target: { id: table2.id, anchor: { name: 'left' } },
      attrs: {
        line: {
          stroke: '#15303a',
          'stroke-width': 2,
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 z'
          }
        }
      },
      labels: [
        {
          position: 0.5,
          attrs: {
            text: {
              text: '1:n',
              'font-size': 12,
              'font-family': 'Arial'
            },
            rect: {
              fill: 'white'
            }
          }
        }
      ]
    });

    const link2 = new joint.shapes.standard.Link({
      source: { id: table2.id, anchor: { name: 'bottom' } },
      target: { id: table4.id, anchor: { name: 'top' } },
      vertices: [{ x: 400, y: 250 }],
      attrs: {
        line: {
          stroke: '#15303a',
          'stroke-width': 2,
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 z'
          }
        }
      },
      labels: [
        {
          position: 0.5,
          attrs: {
            text: {
              text: '1:n',
              'font-size': 12,
              'font-family': 'Arial'
            },
            rect: {
              fill: 'white'
            }
          }
        }
      ]
    });

    const link3 = new joint.shapes.standard.Link({
      source: { id: table3.id, anchor: { name: 'bottom' } },
      target: { id: table4.id, anchor: { name: 'right' } },
      vertices: [{ x: 700, y: 320 }],
      attrs: {
        line: {
          stroke: '#15303a',
          'stroke-width': 2,
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 z'
          }
        }
      },
      labels: [
        {
          position: 0.5,
          attrs: {
            text: {
              text: '1:n',
              'font-size': 12,
              'font-family': 'Arial'
            },
            rect: {
              fill: 'white'
            }
          }
        }
      ]
    });

    this.graph.addCells([link1, link2, link3]);
    
    // Auto fit content when diagram is loaded
    setTimeout(() => this.fitContent(), 100);
  }
} 