import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as joint from 'jointjs';
import * as $ from 'jquery';

// Make jQuery available to JointJS
(window as any).$ = (window as any).jQuery = $;

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
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
      interactive: true
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
      // attrs: {
      //   '.': { magnet: false },
      //   '.table-header': {
      //     fill: '#f5f5f5',
      //     stroke: '#d3d3d3',
      //     strokeWidth: 1,
      //     height: 30,
      //     rx: 4,
      //     ry: 4,
      //     'pointer-events': 'none'
      //   },
      //   '.table-body': {
      //     fill: '#ffffff',
      //     stroke: '#d3d3d3',
      //     strokeWidth: 1,
      //     rx: 0,
      //     ry: 0,
      //     'pointer-events': 'none'
      //   },
      //   '.table-name': {
      //     'font-size': 14,
      //     'font-weight': 'bold',
      //     fill: '#333333',
      //     'text-anchor': 'middle',
      //     'ref-x': .5,
      //     'ref-y': 18,
      //     'y-alignment': 'middle',
      //     'pointer-events': 'none'
      //   }
      // }
    }, {
      markup: [
        { tagName: 'rect', selector: 'table-header' },
        { tagName: 'rect', selector: 'table-body' },
        { tagName: 'text', selector: 'table-name' },
        { tagName: 'g', selector: 'column-container' }
      ]
    });

    // Create and add tables to graph first
    const tables: joint.dia.Element[] = [];
    
    // Helper function to create a table
    const createTable = (name: string, columns: Array<{name: string, type: string}>, position: { x: number, y: number }): joint.dia.Element => {
      const table = new Table({
        position,
        size: { width: 200, height: 44 + columns.length * 26 }
      });
      
      table.attr({
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
          height: columns.length * 26 + 8,
          'ref-y': 36,  
          fill: '#f5f5f5',
          rx: 6,
          ry: 6
        },
        'table-name': {
          text: name,   
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
      
      
      
      return table;
    };

    // Create tables
    const customers = createTable('Tabela 1', [
      { name: 'A1', type: 'INT' },
      { name: 'B', type: '?' }
    ], { x: 100, y: 100 });

    const orders = createTable('Orders', [
      { name: 'id_order', type: 'PK' },
      { name: 'id_customer', type: 'FK' },
      { name: 'order_date', type: '' },
      { name: 'total', type: '' }
    ], { x: 400, y: 100 });

    const products = createTable('Products', [
      { name: 'id_product', type: 'PK' },
      { name: 'name', type: '' },
      { name: 'price', type: '' },
      { name: 'description', type: '' }
    ], { x: 700, y: 100 });

    const orderItems = createTable('Order_Items', [
      { name: 'id_order_item', type: 'PK' },
      { name: 'id_order', type: 'FK' },
      { name: 'id_product', type: 'FK' },
      { name: 'quantity', type: '' },
      { name: 'price', type: '' }
    ], { x: 550, y: 300 });
    
    // Add all tables to graph at once
    this.graph.addCells([customers, orders, products, orderItems]);
    
    // Add columns to each table after they are in the graph
    this.addColumnsToTable(customers, [
      { name: 'A1', type: 'INT' },
      { name: 'B', type: '?' }
    ]);
    
    this.addColumnsToTable(orders, [
      { name: 'id_order', type: 'PK' },
      { name: 'id_customer', type: 'FK' },
      { name: 'order_date', type: '' },
      { name: 'total', type: '' }
    ]);
    
    this.addColumnsToTable(products, [
      { name: 'id_product', type: 'PK' },
      { name: 'name', type: '' },
      { name: 'price', type: '' },
      { name: 'description', type: '' }
    ]);
    
    this.addColumnsToTable(orderItems, [
      { name: 'id_order_item', type: 'PK' },
      { name: 'id_order', type: 'FK' },
      { name: 'id_product', type: 'FK' },
      { name: 'quantity', type: '' },
      { name: 'price', type: '' }
    ]);
  }
  
  private addColumnsToTable(table: joint.dia.Element, columns: Array<{name: string, type: string}>): void {
    const view = this.paper.findViewByModel(table);
    if (!view) return;
    
    const columnContainer = view.findBySelector('column-container')[0];
    if (!columnContainer) return;
    
    columns.forEach((column, i) => {
      // Create circle bullet
      const bullet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bullet.setAttribute('cx', '16');
      bullet.setAttribute('cy', (46 + i * 26).toString());
      bullet.setAttribute('r', '4');
      bullet.setAttribute('fill', '#3498db');
      columnContainer.appendChild(bullet);
      
      // Create column name
      const columnName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      columnName.setAttribute('class', 'column-name');
      columnName.setAttribute('x', '30');
      columnName.setAttribute('y', (50 + i * 26).toString());
      columnName.setAttribute('font-size', '12');
      columnName.setAttribute('font-family', 'Arial, sans-serif');
      columnName.setAttribute('fill', '#333333');
      columnName.textContent = column.name;
      columnContainer.appendChild(columnName);
      
      // Create column type (right-aligned)
      if (column.type) {
        const columnType = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        columnType.setAttribute('class', 'column-type');
        columnType.setAttribute('x', '180');
        columnType.setAttribute('y', (50 + i * 26).toString());
        columnType.setAttribute('font-size', '12');
        columnType.setAttribute('font-family', 'Arial, sans-serif');
        columnType.setAttribute('fill', '#777777');
        columnType.setAttribute('text-anchor', 'end');
        columnType.textContent = column.type;
        columnContainer.appendChild(columnType);
      }
    });
  }
} 