import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  
  constructor() {
    // Initialize with default table for testing
    this.addTable({
      id: this.generateId(),
      name: 'Tabela 1',
      columns: [
        { name: 'ID', type: 'INT' }
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
  
  // Generate a unique ID
  private generateId(prefix: string = 'table_'): string {
    return prefix + Math.random().toString(36).substr(2, 9);
  }
}
