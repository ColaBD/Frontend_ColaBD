import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as joint from 'jointjs';
import * as $ from 'jquery';
import html2canvas from 'html2canvas';
import { SchemaService, TableDefinition, Relationship, RelationshipType } from '../../services/schema.service';
import { JointJSCell, JointJSGraph } from '../../services/jointjs-data.interface';
import { Subject, Subscription } from 'rxjs';
import { SchemaApiWebsocketService } from '../../services/colaborative/schema-api-websocket.service';
import { ActivatedRoute } from '@angular/router';
import { BaseTable, CreateTable, DeleteTable, MoveTable, UpdateTable, TableAttrs } from '../../models/schema-colab.models';

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
export class DiagramComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('diagram') diagramElement!: ElementRef;
  @ViewChild('relationshipDropdown') relationshipDropdown!: ElementRef;
  @ViewChild('relationshipSelect') relationshipSelect!: ElementRef<HTMLSelectElement>;
  precisaSalvar: Subject<boolean> = new Subject<boolean>();
  dadosRecebidos: boolean = false;
  indexTablesLoaded = 1; 
  qtTablesLoaded = 0;
  
  private readonly minScale: number = 0.4;
  private readonly scaleStep: number = 0.1;
  private readonly wheelThrottleMs: number = 16; // ~60fps
  private readonly maxScale: number = 2;
  private readonly wheelZoomSensitivity: number = 0.1;
  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;
  private currentScale: number = 1;
  private tableElementsMap = new Map<string, joint.dia.Element>();
  private relationshipLinksMap = new Map<string, joint.dia.Link>();
  private subscription: Subscription = new Subscription();
  private sourceElement: joint.dia.Element | null = null;
  private resizeObserver?: ResizeObserver;
  private resizeHandler?: () => void;
  private wheelHandler?: (event: WheelEvent) => void;
  private lastWheelTime: number = 0;
  private resizeTimeout: any;
  private windowResizeTimeout: any;
  isLinkingMode: boolean = false;

  // Relationship dropdown properties
  showRelationshipDropdown: boolean = false;
  private selectedLink: joint.dia.Link | null = null;
  private selectedRelationshipId: string | null = null;

  constructor(
    private schemaService: SchemaService, 
    private socketService: SchemaApiWebsocketService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.socketService.connectWS(this.route.snapshot.paramMap.get("id"));

    this.subscription.add(
      this.socketService.schemaAtualizadoSubject.subscribe((received_ws_data) => {
        this.dadosRecebidos = true;
        console.log("Dados recebidos via WebSockettttttttt:   ", JSON.stringify(received_ws_data));
        this.loadJointJSFromWS(received_ws_data)
      })
    );
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeJointJs();
      this.subscribeToTableChanges();
      this.subscribeToRelationshipChanges();
      this.setupGraphChangeListener();
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.dadosRecebidos = false;
    this.indexTablesLoaded = 1; 

    // Clear any pending timeouts
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.windowResizeTimeout) {
      clearTimeout(this.windowResizeTimeout);
    }
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up window resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    
    // Clean up wheel event listener
    if (this.wheelHandler) {
      this.diagramElement.nativeElement.removeEventListener('wheel', this.wheelHandler);
    }

    // Clean up document click listener for dropdown
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    
    // Clean up JointJS instances
    if (this.paper) {
      this.paper.remove();
    }
    if (this.graph) {
      this.graph.clear();
    }
  }

  private tableAction(cells: JointJSCell[] ,receivedData: BaseTable) {
    if (receivedData instanceof CreateTable) {
      console.log("CreateTable recebido");
      cells = this.manipulateCreateTable(cells, receivedData);
    } 
    else if (receivedData instanceof DeleteTable) {
      console.log("DeleteTable recebido");
      cells = this.manipulateDeleteTable(cells, receivedData);
    } 
    else if (receivedData instanceof UpdateTable) {
      console.log("UpdateTable recebido");
      cells = this.manipulateUpdateTable(cells, receivedData);
    } 
    else if (receivedData instanceof MoveTable) {
      console.log("MoveTable recebido");
      cells = this.manipulateMoveTable(cells, receivedData);
    }

    return cells;
  }

  private manipulateCreateTable(cells: JointJSCell[] ,receivedData: CreateTable): JointJSCell[] {
    const jointJsCell: JointJSCell = {
      id: receivedData.id,
      type: receivedData.type,
      position: receivedData.position,
      size: receivedData.size,
      attrs: {...receivedData.attrs},
    }
    cells.push(jointJsCell); // copia os dados da classe para objeto literal

    return cells;
  }

  private manipulateDeleteTable(cells: JointJSCell[] ,receivedData: DeleteTable): JointJSCell[] {
    const index = cells.findIndex(item => item.id.includes(receivedData.id));

    if (index !== -1) {
      cells.splice(index, 1);
    }

    return cells;
  }

  private manipulateUpdateTable(cells: JointJSCell[] ,receivedData: UpdateTable): JointJSCell[] {
    const item = cells.find(cell => cell.id.includes(receivedData.id));
    if (item) {
      item.attrs = {...receivedData.attrs};
    }

    return cells;
  }

  private manipulateMoveTable(cells: JointJSCell[] ,receivedData: MoveTable): JointJSCell[] {
    const item = cells.find(cell => cell.id.includes(receivedData.id));
    if (item) {
      if (!item.position) {
        item.position = { x: 0, y: 0 };
      }

      item.position.x = receivedData.position.x;
      item.position.y = receivedData.position.y;
    }

    return cells;
  }

  private loadJointJSFromWS(received_ws_data: BaseTable): void {
    try {
      const current_cells = this.schemaService.exportToJointJSData().cells;

      const updated_cells = this.tableAction(current_cells, received_ws_data);
      
      const graph: JointJSGraph = { cells: updated_cells };

      console.log("Graph atualizado: ", graph);

      this.schemaService.loadFromJointJSData(graph);

      this.fitContent();
      this.dadosRecebidos = false;

      // const cells = this.schemaService.exportToJointJSData().cells;
      // const updatedCells = this.tableAction(cells, received_ws_data);

      // this.graph.resetCells(updatedCells.map(c => new joint.shapes.standard.Rectangle(c)));
  
      // this.schemaService.loadFromJointJSData({ cells: updatedCells });

      // this.fitContent();
      // this.dadosRecebidos = false;

    } catch (error) {
      console.error('Failed to load diagram from JointJS data:', error);
    }
  }

  private sendWSRequest(data: BaseTable, channel: string) {
    this.socketService.atualizacaoSchema(data, channel);

    setTimeout(() => { 
      this.precisaSalvar.next(false);
    }, 3000);
  }

  private get_table_by_id(table_id: string){
    return this.schemaService.exportToJointJSData().cells.filter((tabela) => tabela.id.includes(table_id))[0];
  }

  private addCellAndSend(cell: joint.dia.Cell){
    this.precisaSalvar.next(true);

    const table_id = cell.id.toString().replace(/(element_table_|element_|table_)/g, '');
    const new_table = this.get_table_by_id(table_id);

    if(new_table == undefined){
      return;          
    }

    const dataWS: CreateTable = {
      id: table_id,
      attrs: {...new_table.attrs},
      position: {
        x: new_table.position?.x || 100,
        y: new_table.position?.y || 100
      },
      size: { 
        width: new_table.size?.width || 200 , 
        height: new_table.size?.height || 146 
      },
      type: new_table.type,
    }

    this.sendWSRequest(dataWS, "create_table")
  }

  private removeCellAndSend(cell: joint.dia.Cell){
    this.precisaSalvar.next(true);

    const table_id = cell.id.toString().replace(/(element_table_|element_|table_)/g, '');

    const dataWS: DeleteTable = {
      id: table_id
    }

    console.log('Removidooooooo               ', JSON.stringify(dataWS))

    this.sendWSRequest(dataWS, "delete_table")
  }

  private updateCellAndSend(cell: joint.dia.Cell){
    this.precisaSalvar.next(true);

    const table_id = cell.id.toString().replace(/(element_table_|element_|table_)/g, '');
    const new_attrs = this.get_table_by_id(table_id).attrs;

    const dataWS: UpdateTable = {
      id: table_id,
      attrs: {...new_attrs}
    }

    console.log('Atualizadoooooo               ', JSON.stringify(dataWS))

    this.sendWSRequest(dataWS, "update_table_atributes")
  }

  private moveCellAndSend(cell: joint.dia.Cell){
    this.precisaSalvar.next(true);

    const table_id = cell.id.toString().replace(/(element_table_|element_|table_)/g, '');
    const pos_x = cell.position().x;
    const pos_y = cell.position().y;

    const dataWS: MoveTable = {
      id: table_id,
      position: {
        x: pos_x,
        y: pos_y
      }
    }

    console.log('Movidooooooooooo               ', JSON.stringify(dataWS))

    this.sendWSRequest(dataWS, "move_table")
  }

  setQtTablesReceived(qtTablesLoaded: number){
    this.qtTablesLoaded = qtTablesLoaded;
  }

  private setupGraphChangeListener() {
    this.graph.on('add', (cell: joint.dia.Cell) => {
      if(!this.dadosRecebidos && this.indexTablesLoaded > this.qtTablesLoaded){
        this.addCellAndSend(cell);
      }

      this.indexTablesLoaded += this.indexTablesLoaded <= this.qtTablesLoaded? 1 : 0;
    });
  
    this.graph.on('remove', (cell: joint.dia.Cell) => {
      if(!this.dadosRecebidos){
        // pode usar a mesma ação para adicionar e remover links
        this.removeCellAndSend(cell);
      }
    });

    this.graph.on('change:attrs', (cell: joint.dia.Cell) => {
      if(!this.dadosRecebidos){
        this.updateCellAndSend(cell);
      }
    });

    this.graph.on('change:position', (cell: joint.dia.Cell) => {
      if(!this.dadosRecebidos && this.indexTablesLoaded > this.qtTablesLoaded){
        this.moveCellAndSend(cell);
      }
      
      this.indexTablesLoaded += this.indexTablesLoaded <= this.qtTablesLoaded? 1 : 0;
    });
  }

  private initializeJointJs(): void {
    // Ensure the diagram element is available and has dimensions
    if (!this.diagramElement?.nativeElement) {
      console.error('Diagram element not available');
      return;
    }

    const element = this.diagramElement.nativeElement;
    
    // Wait for element to have dimensions
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      console.warn('Diagram element has no dimensions, retrying...');
      setTimeout(() => this.initializeJointJs(), 50);
      return;
    }

    try {
      this.graph = new joint.dia.Graph();
      
      this.paper = new joint.dia.Paper({
        el: element,
        model: this.graph,
        width: element.offsetWidth,
        height: element.offsetHeight,
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

      // Set up responsive resizing
      this.setupResponsiveResize();
      
      // Add panning
      this.setupPanning();
      
      // Add wheel zoom functionality
      this.setupWheelZoom();

      // Set up event handlers
      this.setupEventHandlers();

    } catch (error) {
      console.error('Failed to initialize JointJS:', error);
      // Retry after a short delay
      setTimeout(() => this.initializeJointJs(), 100);
    }
  }

  private setupResponsiveResize(): void {
    const resize = () => {
      if (!this.paper || !this.diagramElement?.nativeElement) {
        return;
      }

      const element = this.diagramElement.nativeElement;
      const parentWidth = element.offsetWidth;
      const parentHeight = element.offsetHeight;
      
      // Only resize if dimensions are valid
      if (parentWidth > 0 && parentHeight > 0) {
        try {
          this.paper.setDimensions(parentWidth, parentHeight);
        } catch (error) {
          console.error('Error resizing paper:', error);
        }
      }
    };

    // Initial resize with delay to ensure DOM is ready
    setTimeout(() => {
      resize();
    }, 100);
    
    // Set up ResizeObserver to watch for container size changes
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.resizeObserver = new ResizeObserver((entries) => {
      // Throttle resize events to prevent excessive calls
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            requestAnimationFrame(() => {
              resize();
            });
          }
        }
      }, 16); // ~60fps throttling
    });
    
    // Start observing the diagram container
    this.resizeObserver.observe(this.diagramElement.nativeElement);
    
    // Also listen to window resize for cases when window itself is resized
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    
    this.resizeHandler = () => {
      clearTimeout(this.windowResizeTimeout);
      this.windowResizeTimeout = setTimeout(() => {
        resize();
      }, 100);
    };
    
    window.addEventListener('resize', this.resizeHandler);
    
    // Listen for visibility changes (when tabs switch, etc.)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, force resize in case dimensions changed
        setTimeout(() => {
          resize();
        }, 100);
      }
    });
  }

  private setupEventHandlers(): void {
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
            // Get source and target tables
            const sourceTable = this.schemaService.getTablesSnapshot().find(t => t.id === sourceId);
            const targetTable = this.schemaService.getTablesSnapshot().find(t => t.id === targetId);
            
            if (sourceTable && targetTable) {
              // Find primary key in source table
              const primaryKeyColumn = sourceTable.columns.find(col => col.isPrimaryKey);
              
              if (primaryKeyColumn) {
                // Create foreign key column name
                const foreignKeyName = `${sourceTable.name.toLowerCase()}_${primaryKeyColumn.name.toLowerCase()}`;
                
                // Check if foreign key column already exists
                const existingForeignKey = targetTable.columns.find(col => col.name === foreignKeyName);
                
                if (!existingForeignKey) {
                  // Add foreign key column to target table
                  const foreignKeyColumn = {
                    name: foreignKeyName,
                    type: primaryKeyColumn.type,
                    length: primaryKeyColumn.length,
                    isForeignKey: true,
                    isNotNull: true,
                    helpText: `FK para ${sourceTable.name}.${primaryKeyColumn.name}`
                  };
                  
                  // Update target table with new foreign key column
                  const updatedTargetTable = {
                    ...targetTable,
                    columns: [...targetTable.columns, foreignKeyColumn]
                  };
                  
                  this.schemaService.updateTable(updatedTargetTable);
                }
                
                // Create the relationship with column references
                const newRelationship = {
                  id: '',
                  sourceTableId: sourceId,
                  targetTableId: targetId,
                  sourceColumnId: primaryKeyColumn.name,
                  targetColumnId: existingForeignKey ? existingForeignKey.name : foreignKeyName,
                  type: RelationshipType.OneToMany
                };

                this.schemaService.addRelationship(newRelationship);
              } else {
                this.schemaService.addRelationship({
                  id: '',
                  sourceTableId: sourceId,
                  targetTableId: targetId,
                  type: RelationshipType.OneToMany
                });
              }
            } else {
              console.log('Source or target table not found');
            }
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

    // Handle single clicks on links to show relationship type dropdown
    this.paper.on('link:pointerclick', (linkView: joint.dia.LinkView, evt: any) => {
      evt.stopPropagation();
      
      const link = linkView.model;
      const relationshipId = this.getRelationshipIdFromLinkId(link.id.toString());
      
      if (relationshipId) {
        // Get click position relative to the diagram container
        const diagramRect = this.diagramElement.nativeElement.getBoundingClientRect();
        const x = evt.clientX - diagramRect.left + 10;
        const y = evt.clientY - diagramRect.top - 10;
        
        this.showRelationshipDropdownAt(x, y, link, relationshipId);
      }
    });

    // Add document click listener to close dropdown when clicking outside
    document.addEventListener('click', this.handleDocumentClick);
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

  private setupWheelZoom(): void {
    // Create bound function for proper cleanup
    this.wheelHandler = (event: WheelEvent) => {
      this.handleWheel(event);
    };
    
    // Add wheel event listener to the diagram container
    this.diagramElement.nativeElement.addEventListener('wheel', this.wheelHandler);
  }

  private handleWheel(event: WheelEvent): void {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    // Throttle wheel events to prevent excessive zoom
    const currentTime = Date.now();
    if (currentTime - this.lastWheelTime < this.wheelThrottleMs) {
      return;
    }
    this.lastWheelTime = currentTime;
    
    // Get mouse position relative to the diagram container
    const rect = this.diagramElement.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Determine zoom direction based on wheel delta
    if (event.deltaY < 0) {
      // Mouse wheel up - zoom in
      this.zoomInAtPoint(mouseX, mouseY);
    } else if (event.deltaY > 0) {
      // Mouse wheel down - zoom out
      this.zoomOutAtPoint(mouseX, mouseY);
    }
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
      } 
      else {
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
    // tableElement.set('cols', table.columns);

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

    // Update relationship type label
    link.label(0, {
      attrs: {
        text: {
          text: this.getRelationshipTypeLabel(relationship.type),
          fontSize: 12,
          fontWeight: 'bold',
          fill: '#007bff'
        },
        rect: {
          fill: 'white',
          stroke: '#007bff',
          strokeWidth: 2,
          rx: 8,
          ry: 8
        }
      },
      position: 0.5
    });
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
      connector: { name: 'rounded' },
      // Add relationship type label
      labels: [{
        attrs: {
          text: {
            text: this.getRelationshipTypeLabel(relationship.type),
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#007bff'
          },
          rect: {
            fill: 'white',
            stroke: '#007bff',
            strokeWidth: 2,
            rx: 4,
            ry: 4
          }
        },
        position: 0.5
      }]
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
    // Create symbol based on column type
    if (column.isPrimaryKey) {
      // Create key icon for primary key
      const keyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      keyIcon.setAttribute('x', '16');
      keyIcon.setAttribute('y', (50 + index * 26).toString());
      keyIcon.setAttribute('font-size', '12');
      keyIcon.setAttribute('font-family', 'Arial, sans-serif');
      keyIcon.setAttribute('fill', '#ffb300');
      keyIcon.setAttribute('text-anchor', 'middle');
      keyIcon.textContent = '🔑';
      container.appendChild(keyIcon);
    } else if (column.isUnique) {
      // Create diamond symbol for unique columns
      const uniqueIcon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      uniqueIcon.setAttribute('points', '16,42 20,46 16,50 12,46');
      uniqueIcon.setAttribute('fill', '#9c27b0');
      uniqueIcon.setAttribute('transform', `translate(0, ${index * 26})`);
      container.appendChild(uniqueIcon);
    } else {
      // Create circle bullet for regular columns
      const bullet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bullet.setAttribute('cx', '16');
      bullet.setAttribute('cy', (46 + index * 26).toString());
      bullet.setAttribute('r', '4');
      bullet.setAttribute('fill', '#3498db');
      container.appendChild(bullet);
    }
    
    // Create column name
    const columnName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    columnName.setAttribute('class', 'column-name');
    columnName.setAttribute('x', '30');
    columnName.setAttribute('y', (50 + index * 26).toString());
    columnName.setAttribute('font-size', '12');
    columnName.setAttribute('font-family', 'Arial, sans-serif');
    columnName.setAttribute('fill', '#333333');
    
    // Add indicator for NOT NULL columns only (removed unique indicator)
    let columnText = column.name;
    if (column.isNotNull) {
      columnText += ' *';
    }
    
    columnName.textContent = columnText;
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
      
      // Format type with length for VARCHAR/CHAR
      let typeText = column.type;
      if (column.type === 'VARCHAR' || column.type === 'CHAR') {
        if (column.length) {
          typeText = `${column.type}(${column.length})`;
        } else {
          typeText = column.type;
        }
      }
      
      columnType.textContent = typeText;
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
    if (!this.ensureJointJSInitialized()) return;
    
    if (this.currentScale < this.maxScale) {
      this.currentScale += this.scaleStep;
      this.paper.scale(this.currentScale);
    }
  }

  zoomOut(): void {
    if (!this.ensureJointJSInitialized()) return;
    
    if (this.currentScale > this.minScale) {
      this.currentScale -= this.scaleStep;
      this.paper.scale(this.currentScale);
    }
  }

  zoomInAtPoint(x: number, y: number): void {
    if (!this.ensureJointJSInitialized()) return;
    
    if (this.currentScale < this.maxScale) {
      const newScale = Math.min(this.maxScale, this.currentScale + this.wheelZoomSensitivity);
      this.zoomAtPoint(x, y, newScale);
    }
  }

  zoomOutAtPoint(x: number, y: number): void {
    if (!this.ensureJointJSInitialized()) return;
    
    if (this.currentScale > this.minScale) {
      const newScale = Math.max(this.minScale, this.currentScale - this.wheelZoomSensitivity);
      this.zoomAtPoint(x, y, newScale);
    }
  }

  private zoomAtPoint(x: number, y: number, newScale: number): void {
    if (!this.ensureJointJSInitialized()) return;
    
    // Get current transform
    const currentTransform = this.paper.translate();
    const currentScale = this.paper.scale();
    
    // Calculate the point in the paper coordinate system
    const paperPoint = {
      x: (x - currentTransform.tx) / currentScale.sx,
      y: (y - currentTransform.ty) / currentScale.sy
    };
    
    // Update scale
    this.currentScale = newScale;
    this.paper.scale(newScale);
    
    // Calculate new translation to keep the point under the mouse
    const newTranslate = {
      x: x - paperPoint.x * newScale,
      y: y - paperPoint.y * newScale
    };
    
    // Apply the new translation
    this.paper.translate(newTranslate.x, newTranslate.y);
  }

  fitContent(): void {
    if (!this.ensureJointJSInitialized()) return;
    
    this.paper.scaleContentToFit({
      padding: 50,
      minScale: this.minScale,
      maxScale: this.maxScale
    });
    this.currentScale = this.paper.scale().sx;
  }

  // Relationship dropdown methods

  private handleDocumentClick = (event: Event): void => {
    const target = event.target as Element;
    if (!this.relationshipDropdown.nativeElement.contains(target) && 
        !target.closest('.joint-link')) {
      this.hideRelationshipDropdown();
    }
  }

  private showRelationshipDropdownAt(x: number, y: number, link: joint.dia.Link, relationshipId: string): void {
    this.selectedLink = link;
    this.selectedRelationshipId = relationshipId;
    
    // Position dropdown
    const dropdown = this.relationshipDropdown.nativeElement;
    dropdown.style.left = x + 'px';
    dropdown.style.top = y + 'px';
    
    // Set current value
    const relationship = this.schemaService.getRelationshipsSnapshot().find(r => r.id === relationshipId);
    if (relationship && this.relationshipSelect) {
      this.relationshipSelect.nativeElement.value = relationship.type;
    }
    
    this.showRelationshipDropdown = true;
    
    // Focus on select after view update
    setTimeout(() => {
      if (this.relationshipSelect) {
        this.relationshipSelect.nativeElement.focus();
      }
    }, 0);
  }

  hideRelationshipDropdown(): void {
    this.showRelationshipDropdown = false;
    this.selectedLink = null;
    this.selectedRelationshipId = null;
  }

  onRelationshipTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newType = target.value as RelationshipType;
    
    if (this.selectedRelationshipId && newType) {
      // Get the current relationship
      const relationship = this.schemaService.getRelationshipsSnapshot().find(r => r.id === this.selectedRelationshipId);
      
      if (relationship) {
        // Update the relationship type
        const updatedRelationship: Relationship = {
          ...relationship,
          type: newType
        };
        
        this.schemaService.updateRelationship(updatedRelationship);
      }
    }
    
    this.hideRelationshipDropdown();
  }

  private getRelationshipTypeLabel(type: RelationshipType): string {
    switch (type) {
      case RelationshipType.OneToOne:
        return '1:1';
      case RelationshipType.OneToMany:
        return '1:n';
      case RelationshipType.ManyToOne:
        return 'n:1';
      case RelationshipType.ManyToMany:
        return 'n:n';
      default:
        return '';
    }
  }

  // JointJS Data Import Methods
  
  loadFromJointJSData(jointjsData: JointJSGraph): void {
    try {
      this.schemaService.loadFromJointJSData(jointjsData);
      this.dadosRecebidos = false;

      setTimeout(() => {
        this.fitContent();
      }, 100);

    } catch (error) {
      console.error('Failed to load diagram from JointJS data:', error);
    }
  }
  
  loadFromJSONString(jsonString: string): void {
    try {
      const jointjsData: JointJSGraph = JSON.parse(jsonString);
      this.loadFromJointJSData(jointjsData);
    } catch (error) {
      console.error('Failed to load diagram from JSON string:', error);
      throw new Error('Invalid JSON format');
    }
  }

  exportToJointJSData(): JointJSGraph {
    return this.schemaService.exportToJointJSData();
  }

  exportToJSONString(): string {
    return this.schemaService.exportToJSONString();
  }

  clearDiagram(): void {
    this.schemaService.clearSchema();
  }

  loadSampleData(): void {
    const sampleData: JointJSGraph = {
      cells: [
        {
          type: 'standard.Rectangle',
          id: 'table_users',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 120 },
          attrs: {
            label: { text: 'Users' },
            'row@0-name': { text: 'id' },
            'row@0-type': { text: 'INT' },
            'row@0-meta': { pk: true, fk: false },
            'row@1-name': { text: 'name' },
            'row@1-type': { text: 'VARCHAR(255)' },
            'row@1-meta': { pk: false, fk: false },
            'row@2-name': { text: 'email' },
            'row@2-type': { text: 'VARCHAR(255)' },
            'row@2-meta': { pk: false, fk: false }
          }
        },
        {
          type: 'standard.Rectangle',
          id: 'table_orders',
          position: { x: 400, y: 100 },
          size: { width: 200, height: 120 },
          attrs: {
            label: { text: 'Orders' },
            'row@0-name': { text: 'id' },
            'row@0-type': { text: 'INT' },
            'row@0-meta': { pk: true, fk: false },
            'row@1-name': { text: 'user_id' },
            'row@1-type': { text: 'INT' },
            'row@1-meta': { pk: false, fk: true },
            'row@2-name': { text: 'total' },
            'row@2-type': { text: 'DECIMAL(10,2)' },
            'row@2-meta': { pk: false, fk: false }
          }
        },
        {
          type: 'standard.Link',
          id: 'rel_users_orders',
          source: { id: 'table_users' },
          target: { id: 'table_orders' },
          labels: [{
            attrs: {
              text: { text: '1:n' }
            },
            position: 0.5
          }]
        }
      ]
    };
    
    this.loadFromJointJSData(sampleData);
  }

  reinitializeDiagram(): void {
    console.log('Force reinitializing diagram...');

    if (this.paper) {
      this.paper.remove();
    }
    if (this.graph) {
      this.graph.clear();
    }
    
    this.tableElementsMap.clear();
    this.relationshipLinksMap.clear();
    
    // Reinitialize
    setTimeout(() => {
      this.initializeJointJs();
      this.subscribeToTableChanges();
      this.subscribeToRelationshipChanges();
    }, 100);
  }

  forceResize(): void {
    if (!this.ensureJointJSInitialized()) return;
    
    const element = this.diagramElement.nativeElement;
    const parentWidth = element.offsetWidth;
    const parentHeight = element.offsetHeight;
    
    console.log(`Force resizing canvas to: ${parentWidth}x${parentHeight}`);
    
    if (parentWidth > 0 && parentHeight > 0) {
      try {
        this.paper.setDimensions(parentWidth, parentHeight);
        
        // Also trigger a repaint
        this.paper.drawBackground();
        this.paper.drawGrid();
        
        console.log('Canvas force resized successfully');
      } catch (error) {
        console.error('Error force resizing canvas:', error);
      }
    } else {
      console.warn('Cannot resize canvas: invalid dimensions', { parentWidth, parentHeight });
    }
  }

  debugCanvasState(): void {
    console.log('=== Canvas Debug Info ===');
    console.log('JointJS initialized:', this.isJointJSInitialized());
    
    if (this.diagramElement?.nativeElement) {
      const element = this.diagramElement.nativeElement;
      console.log('Container dimensions:', {
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight
      });
      
      const computedStyle = window.getComputedStyle(element);
      console.log('Container computed style:', {
        width: computedStyle.width,
        height: computedStyle.height,
        display: computedStyle.display,
        position: computedStyle.position,
        visibility: computedStyle.visibility
      });
    }
    
    if (this.paper) {
      const paperSize = this.paper.getComputedSize();
      console.log('Paper dimensions:', paperSize);
      console.log('Current scale:', this.currentScale);
    }
    
    console.log('=== End Debug Info ===');
  }

  private isJointJSInitialized(): boolean {
    return !!(this.graph && this.paper && this.diagramElement?.nativeElement);
  }

  private ensureJointJSInitialized(): boolean {
    if (!this.isJointJSInitialized()) {
      console.warn('JointJS not initialized, attempting to initialize...');
      this.initializeJointJs();
      return this.isJointJSInitialized();
    }
    return true;
  }

  async takeScreenshot(filename: string = 'schema-diagram.png'): Promise<void> {
    if (!this.diagramElement?.nativeElement) {
      console.error('Diagram element not available');
      return;
    }

    try {
      const canvasElement = this.diagramElement.nativeElement;
      
      // Temporarily hide the controls during screenshot
      const controlsElement = canvasElement.parentElement?.querySelector('.diagram-controls') as HTMLElement;
      const originalDisplay = controlsElement?.style.display || '';
      if (controlsElement) {
        controlsElement.style.display = 'none';
      }

      // Use html2canvas to capture the element
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasElement.scrollWidth,
        height: canvasElement.scrollHeight,
        ignoreElements: (element) => {
          // Ignore the controls panel
          return element.classList.contains('diagram-controls');
        }
      });

      // Download the image
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          this.downloadBlob(blob, filename);
          console.log('Screenshot captured successfully!');
        }
      }, 'image/png', 1.0);

      // Restore controls visibility
      if (controlsElement) {
        controlsElement.style.display = originalDisplay;
      }

    } catch (error) {
      console.error('Error taking screenshot:', error);
      // Fallback to canvas method
      try {
        await this.captureWithCanvas(this.diagramElement.nativeElement, filename);
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        alert('Erro ao capturar screenshot. Tente novamente.');
      }
    }
  }

  private async captureWithCanvas(element: HTMLElement, filename: string): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2x for better quality
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Try to get SVG content from JointJS paper
    if (this.paper?.svg) {
      const svgElement = this.paper.svg;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      
      // Create image from SVG
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG'));
        };
        img.src = url;
      });

      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          this.downloadBlob(blob, filename);
          console.log('Screenshot captured with canvas fallback!');
        }
      }, 'image/png', 1.0);
    } else {
      throw new Error('No SVG content available');
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async getCanvasForSave(): Promise<HTMLCanvasElement | null> {
    if (!this.diagramElement?.nativeElement) {
      console.error('Diagram element not available');
      return null;
    }

    try {
      const canvasElement = this.diagramElement.nativeElement;
      
      // Temporarily hide the controls during capture
      const controlsElement = canvasElement.parentElement?.querySelector('.diagram-controls') as HTMLElement;
      const originalDisplay = controlsElement?.style.display || '';
      if (controlsElement) {
        controlsElement.style.display = 'none';
      }

      // Use html2canvas to capture the element
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasElement.scrollWidth,
        height: canvasElement.scrollHeight,
        ignoreElements: (element) => {
          // Ignore the controls panel
          return element.classList.contains('diagram-controls');
        }
      });

      // Restore controls visibility
      if (controlsElement) {
        controlsElement.style.display = originalDisplay;
      }

      return canvas;
    } catch (error) {
      console.error('Error capturing canvas for save:', error);
      return null;
    }
  }

  async takeCleanScreenshot(filename: string = 'schema-diagram.png'): Promise<void> {
    // Deprecated - use takeScreenshot instead
    return this.takeScreenshot(filename);
  }
} 