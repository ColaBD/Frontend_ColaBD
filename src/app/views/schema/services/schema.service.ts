import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { JointJSParserService } from './jointjs-parser.service';
import { SchemaBackendService } from './schema-backend.service';
import { JointJSGraph } from './jointjs-data.interface';

export interface TableColumn {
  name: string;
  type: string;
  length?: number;
  helpText?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
}

export interface TableIndex {
  id: string;
  name: string;
  columns: string[];
  type: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
  isUnique: boolean;
}

export interface TableDefinition {
  id: string;
  name: string;
  columns: TableColumn[];
  indices?: TableIndex[];
  comment?: string;
  position?: { x: number, y: number };
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceColumnId?: string;
  targetColumnId?: string;
  type: RelationshipType;
  vertices?: Array<{ x: number, y: number }>;
}

export enum RelationshipType {
  OneToOne = 'one-to-one',
  OneToMany = 'one-to-many',
  ManyToOne = 'many-to-one',
  ManyToMany = 'many-to-many'
}

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private tables = new BehaviorSubject<TableDefinition[]>([]);
  private tablesMap = new Map<string, TableDefinition>();
  private relationships = new BehaviorSubject<Relationship[]>([]);
  private relationshipsMap = new Map<string, Relationship>();
  
  constructor(
    private jointJSParser: JointJSParserService,
    private backendService: SchemaBackendService
  ) {
    // Initialize with default table for testing
    this.addTable({
      id: this.generateId(),
      name: 'Tabela 1',
      columns: [
        { name: 'ID', type: 'INT', isPrimaryKey: true, isNotNull: true, isUnique: true }
      ],
      position: { x: 100, y: 100 }
    });
  }
  
  // Get all tables as observable
  getTables(): Observable<TableDefinition[]> {
    return this.tables.asObservable();
  }
  
  // Get current tables value
  getTablesSnapshot(): TableDefinition[] {
    return this.tables.getValue();
  }
  
  // Add a new table
  addTable(table: TableDefinition): void {
    if (!table.id) {
      table.id = this.generateId();
    }
    
    if (!table.position) {
      // Set default position with offset based on number of tables
      const count = this.tables.value.length;
      table.position = { 
        x: 100 + (count * 50), 
        y: 100 + (count * 50) 
      };
    }
    
    // Store in map for quick access
    this.tablesMap.set(table.id, table);
    
    // Update the observable
    const updatedTables = [...this.tables.value, table];
    this.tables.next(updatedTables);
  }
  
  // Update an existing table
  updateTable(updatedTable: TableDefinition): void {
    if (!updatedTable.id) return;
    
    this.tablesMap.set(updatedTable.id, updatedTable);
    
    const updatedTables = this.tables.value.map(table => {
      return table.id === updatedTable.id ? updatedTable : table;
    });
    
    this.tables.next(updatedTables);
  }
  
  // Remove a table
  removeTable(tableId: string): void {
    this.tablesMap.delete(tableId);
    
    // Remove all relationships involving this table
    const relatedRelationships = this.relationships.value.filter(
      rel => rel.sourceTableId === tableId || rel.targetTableId === tableId
    );
    
    relatedRelationships.forEach(rel => {
      this.removeRelationship(rel.id);
    });
    
    const updatedTables = this.tables.value.filter(table => table.id !== tableId);
    this.tables.next(updatedTables);
  }
  
  // Update table position in diagram
  updateTablePosition(tableId: string, position: { x: number, y: number }): void {
    const table = this.tablesMap.get(tableId);
    
    if (table) {
      table.position = position;
      this.updateTable(table);
    }
  }

  // Index management methods
  addIndex(tableId: string, index: TableIndex): void {
    const table = this.tablesMap.get(tableId);
    if (table) {
      if (!table.indices) {
        table.indices = [];
      }
      if (!index.id) {
        index.id = this.generateId('idx_');
      }
      table.indices.push(index);
      this.updateTable(table);
    }
  }
  
  updateIndex(tableId: string, indexId: string, updatedIndex: TableIndex): void {
    const table = this.tablesMap.get(tableId);
    if (table && table.indices) {
      const indexIndex = table.indices.findIndex(idx => idx.id === indexId);
      if (indexIndex !== -1) {
        table.indices[indexIndex] = updatedIndex;
        this.updateTable(table);
      }
    }
  }
  
  removeIndex(tableId: string, indexId: string): void {
    const table = this.tablesMap.get(tableId);
    if (table && table.indices) {
      table.indices = table.indices.filter(idx => idx.id !== indexId);
      this.updateTable(table);
    }
  }

  // Relationships methods
  
  // Get all relationships as observable
  getRelationships(): Observable<Relationship[]> {
    return this.relationships.asObservable();
  }
  
  // Get current relationships value
  getRelationshipsSnapshot(): Relationship[] {
    return this.relationships.getValue();
  }
  
  // Add a new relationship
  addRelationship(relationship: Relationship): void {
    if (!relationship.id) {
      relationship.id = this.generateId('rel_');
    }
    
    // Store in map for quick access
    this.relationshipsMap.set(relationship.id, relationship);
    
    // Update the observable
    const updatedRelationships = [...this.relationships.value, relationship];
    this.relationships.next(updatedRelationships);
  }
  
  // Update an existing relationship
  updateRelationship(updatedRelationship: Relationship): void {
    if (!updatedRelationship.id) return;
    
    this.relationshipsMap.set(updatedRelationship.id, updatedRelationship);
    
    const updatedRelationships = this.relationships.value.map(rel => {
      return rel.id === updatedRelationship.id ? updatedRelationship : rel;
    });
    
    this.relationships.next(updatedRelationships);
  }
  
  // Remove a relationship
  removeRelationship(relationshipId: string): void {
    this.relationshipsMap.delete(relationshipId);
    
    const updatedRelationships = this.relationships.value.filter(rel => rel.id !== relationshipId);
    this.relationships.next(updatedRelationships);
  }
  
  // Update relationship vertices
  updateRelationshipVertices(relationshipId: string, vertices: Array<{ x: number, y: number }>): void {
    const relationship = this.relationshipsMap.get(relationshipId);
    
    if (relationship) {
      relationship.vertices = vertices;
      this.updateRelationship(relationship);
    }
  }
  
  // JointJS Data Import/Export Methods
  
  /**
   * Load schema from JointJS graph data (typically from backend)
   */
  loadFromJointJSData(jointjsData: JointJSGraph): void {
    try {
      // Parse the JointJS data
      const parsedData = this.jointJSParser.parseJointJSData(jointjsData);
      
      // Convert to our internal format
      const { tables, relationships } = this.jointJSParser.convertToTableDefinitions(parsedData);
      
      // Clear existing data
      this.clearSchema();
      
      // Load the new data
      tables.forEach(table => {
        this.tablesMap.set(table.id, table);
      });
      relationships.forEach(relationship => {
        this.relationshipsMap.set(relationship.id, relationship);
      });
      
      // Update observables
      this.tables.next(tables);
      this.relationships.next(relationships);
      
      console.log('Schema loaded from JointJS data:', { tables: tables.length, relationships: relationships.length });
    } catch (error) {
      console.error('Failed to load schema from JointJS data:', error);
      throw error;
    }
  }
  
  /**
   * Export current schema to JointJS graph format (for backend storage)
   */
  exportToJointJSData(): JointJSGraph {
    try {
      const currentTables = this.tables.getValue();
      const currentRelationships = this.relationships.getValue();
      
      const jointjsData = this.jointJSParser.convertToJointJSFormat(currentTables, currentRelationships);
      
      console.log('Schema exported to JointJS format:', jointjsData);
      return jointjsData;
    } catch (error) {
      console.error('Failed to export schema to JointJS format:', error);
      throw error;
    }
  }
  
  /**
   * Clear all tables and relationships
   */
  clearSchema(): void {
    this.tablesMap.clear();
    this.relationshipsMap.clear();
    this.tables.next([]);
    this.relationships.next([]);
  }
  
  /**
   * Load schema from a JSON string (helper method)
   */
  loadFromJSONString(jsonString: string): void {
    try {
      const jointjsData: JointJSGraph = JSON.parse(jsonString);
      this.loadFromJointJSData(jointjsData);
    } catch (error) {
      console.error('Failed to parse JSON string:', error);
      throw new Error('Invalid JSON format');
    }
  }
  
  /**
   * Export schema to JSON string (helper method)
   */
  exportToJSONString(): string {
    try {
      const jointjsData = this.exportToJointJSData();
      return JSON.stringify(jointjsData, null, 2);
    } catch (error) {
      console.error('Failed to export to JSON string:', error);
      throw error;
    }
  }

  // Backend Integration Methods
  
  /**
   * Load schema from backend
   */
  loadSchemaFromBackend(schemaId?: string): Observable<void> {
    return new Observable(observer => {
      this.backendService.loadSchema(schemaId).subscribe({
        next: (jointjsData) => {
          try {
            this.loadFromJointJSData(jointjsData);
            observer.next();
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }
  
  /**
   * Save schema to backend
   */
  saveSchemaToBackend(schemaId?: string): Observable<{ id: string, message: string }> {
    const jointjsData = this.exportToJointJSData();
    return this.backendService.saveSchema(jointjsData, schemaId);
  }
  
  /**
   * Load mock schema for development/testing
   */
  loadMockSchema(): Observable<void> {
    return new Observable(observer => {
      this.backendService.loadMockSchema().subscribe({
        next: (jointjsData) => {
          try {
            this.loadFromJointJSData(jointjsData);
            observer.next();
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Generate a unique ID
  private generateId(prefix: string = 'table_'): string {
    return prefix + Math.random().toString(36).substr(2, 9);
  }
}
