import { Injectable } from '@angular/core';
import { 
  JointJSGraph, 
  JointJSCell, 
  ParsedSchemaData, 
  ParsedTableData, 
  ParsedColumnData, 
  ParsedRelationshipData,
  JointJSPosition 
} from './jointjs-data.interface';
import { TableDefinition, TableColumn, Relationship, RelationshipType } from './schema.service';

@Injectable({
  providedIn: 'root'
})
export class JointJSParserService {

  constructor() { }

  /**
   * Parse JointJS graph data into our internal schema format
   */
  parseJointJSData(jointjsData: JointJSGraph): ParsedSchemaData {
    const tables: ParsedTableData[] = [];
    const relationships: ParsedRelationshipData[] = [];

    if (!jointjsData.cells || !Array.isArray(jointjsData.cells)) {
      return { tables, relationships };
    }

    // Separate tables and links
    const tableElements = jointjsData.cells.filter(cell => 
      cell.type === 'standard.Rectangle' || 
      cell.type === 'erp.Table' ||
      this.isTableElement(cell)
    );
    
    const linkElements = jointjsData.cells.filter(cell => 
      cell.type === 'standard.Link' || 
      this.isLinkElement(cell)
    );

    // Parse table elements
    tableElements.forEach(cell => {
      const parsedTable = this.parseTableElement(cell);
      if (parsedTable) {
        tables.push(parsedTable);
      }
    });

    // Parse relationship elements
    linkElements.forEach(cell => {
      const parsedRelationship = this.parseRelationshipElement(cell);
      if (parsedRelationship) {
        relationships.push(parsedRelationship);
      }
    });

    return { tables, relationships };
  }

  /**
   * Convert our internal schema format back to JointJS format
   */
  convertToJointJSFormat(tables: TableDefinition[], relationships: Relationship[]): JointJSGraph {
    const cells: JointJSCell[] = [];

    // Convert tables to JointJS format
    tables.forEach(table => {
      const tableCell = this.convertTableToJointJS(table);
      if (tableCell) {
        cells.push(tableCell);
      }
    });

    // Convert relationships to JointJS format
    relationships.forEach(relationship => {
      const linkCell = this.convertRelationshipToJointJS(relationship);
      if (linkCell) {
        cells.push(linkCell);
      }
    });

    return { cells };
  }

  /**
   * Convert parsed data to our internal TableDefinition format
   */
  convertToTableDefinitions(parsedData: ParsedSchemaData): { tables: TableDefinition[], relationships: Relationship[] } {
    const tables: TableDefinition[] = parsedData.tables.map(parsedTable => ({
      id: parsedTable.id,
      name: parsedTable.name,
      columns: parsedTable.columns.map(col => this.convertToTableColumn(col)),
      position: parsedTable.position
    }));

    const relationships: Relationship[] = parsedData.relationships.map(parsedRel => ({
      id: parsedRel.id,
      sourceTableId: parsedRel.sourceTableId,
      targetTableId: parsedRel.targetTableId,
      sourceColumnId: parsedRel.sourceColumnId,
      targetColumnId: parsedRel.targetColumnId,
      type: this.parseRelationshipType(parsedRel.type),
      vertices: parsedRel.vertices
    }));

    return { tables, relationships };
  }

  private isTableElement(cell: JointJSCell): boolean {
    if (!cell.attrs) return false;

    return (cell.attrs.label !== undefined) ||
          (cell.attrs['table-name'] !== undefined) ||
          Object.keys(cell.attrs).some(key => key.includes('row@'));
  }

  private isLinkElement(cell: JointJSCell): boolean {
    // Check if this cell represents a relationship link
    return !!(cell.source && cell.target);
  }

  private parseTableElement(cell: JointJSCell): ParsedTableData | null {
    try {
      const table: ParsedTableData = {
        id: cell.id,
        name: this.extractTableName(cell),
        columns: this.extractColumns(cell),
        position: cell.position,
        size: cell.size
      };

      return table;
    } catch (error) {
      console.warn('Failed to parse table element:', cell, error);
      return null;
    }
  }

  private parseRelationshipElement(cell: JointJSCell): ParsedRelationshipData | null {
    try {
      if (!cell.source || !cell.target) {
        return null;
      }

      const relationship: ParsedRelationshipData = {
        id: cell.id,
        sourceTableId: cell.source.id,
        targetTableId: cell.target.id,
        vertices: cell.vertices
      };

      // Try to extract relationship type from labels if available
      if (cell.labels && cell.labels.length > 0) {
        const label = cell.labels[0];
        if (label.attrs?.text?.text) {
          relationship.type = label.attrs.text.text;
        }
      }

      return relationship;
    } catch (error) {
      console.warn('Failed to parse relationship element:', cell, error);
      return null;
    }
  }

  private extractTableName(cell: JointJSCell): string {
    // Try different ways to extract table name
    if (cell.attrs?.label?.text) {
      return cell.attrs.label.text;
    }
    
    if (cell.attrs?.['table-name']?.text) {
      return cell.attrs['table-name'].text;
    }

    // Look for any attribute that might contain the table name
    const attrs = cell.attrs || {};
    for (const [key, attr] of Object.entries(attrs)) {
      if (attr && typeof attr === 'object' && attr.text && 
          (key.includes('name') || key.includes('label'))) {
        return attr.text;
      }
    }

    // Fallback to using the cell ID
    return cell.id.replace(/^(element_|table_)/, '') || 'Unnamed Table';
  }

  private extractColumns(cell: JointJSCell): ParsedColumnData[] {
    const columns: ParsedColumnData[] = [];
    const attrs = cell.attrs || {};

    // Look for row attributes that represent columns
    const rowKeys = Object.keys(attrs).filter(key => key.startsWith('row@'));
    
    // Group row attributes by index
    const rowGroups: { [index: string]: any } = {};
    
    rowKeys.forEach(key => {
      const parts = key.split('-');
      if (parts.length >= 2) {
        const rowIndex = parts[0]; // row@0, row@1, etc.
        const property = parts[1]; // name, type, meta
        
        if (!rowGroups[rowIndex]) {
          rowGroups[rowIndex] = {};
        }
        
        rowGroups[rowIndex][property] = attrs[key];
      }
    });

    // Convert row groups to columns
    Object.values(rowGroups).forEach(rowData => {
      const column: ParsedColumnData = {
        name: rowData.name?.text || 'Unnamed',
        type: rowData.type?.text || 'VARCHAR'
      };

      // Extract metadata if available
      if (rowData.meta) {
        column.isPrimaryKey = rowData.meta.pk || false;
        column.isForeignKey = rowData.meta.fk || false;
      }

      // Try to extract constraints from the name or other indicators
      if (column.name.includes('*')) {
        column.isNotNull = true;
        column.name = column.name.replace('*', '').trim();
      }

      columns.push(column);
    });

    // If no columns found through row attributes, create a default one
    if (columns.length === 0) {
      columns.push({
        name: 'id',
        type: 'INT',
        isPrimaryKey: true,
        isNotNull: true,
        isUnique: true
      });
    }

    return columns;
  }

  private convertTableToJointJS(table: TableDefinition): JointJSCell {
    const attrs: any = {
      label: {
        text: table.name,
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#303030'
      }
    };

    // Add column attributes
    table.columns.forEach((column, index) => {
      const rowKey = `row@${index}`;
      attrs[`${rowKey}-name`] = {
        text: column.name + (column.isNotNull ? ' *' : ''),
        fontSize: 12,
        fill: '#333333'
      };
      attrs[`${rowKey}-type`] = {
        text: this.formatColumnType(column),
        fontSize: 12,
        fill: '#777777'
      };
      attrs[`${rowKey}-meta`] = {
        pk: column.isPrimaryKey || false,
        fk: column.isForeignKey || false
      };
    });

    return {
      type: 'standard.Rectangle',
      id: table.id,
      position: table.position || { x: 100, y: 100 },
      size: { 
        width: 200, 
        height: 44 + table.columns.length * 26 
      },
      attrs
    };
  }

  private convertRelationshipToJointJS(relationship: Relationship): JointJSCell {
    const cell: JointJSCell = {
      type: 'standard.Link',
      id: relationship.id,
      source: { id: relationship.sourceTableId },
      target: { id: relationship.targetTableId },
      z: -1
    };

    if (relationship.vertices && relationship.vertices.length > 0) {
      cell.vertices = relationship.vertices;
    }

    // Add relationship type label
    if (relationship.type) {
      cell.labels = [{
        attrs: {
          text: {
            text: this.getRelationshipTypeLabel(relationship.type),
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#007bff'
          },
          rect: {
            fill: 'white',
            stroke: '#007bff'
          }
        },
        position: 0.5
      }];
    }

    return cell;
  }

  private convertToTableColumn(parsedColumn: ParsedColumnData): TableColumn {
    return {
      name: parsedColumn.name,
      type: parsedColumn.type,
      length: parsedColumn.length,
      isPrimaryKey: parsedColumn.isPrimaryKey,
      isForeignKey: parsedColumn.isForeignKey,
      isNotNull: parsedColumn.isNotNull,
      isUnique: parsedColumn.isUnique
    };
  }

  private parseRelationshipType(typeString?: string): RelationshipType {
    if (!typeString) return RelationshipType.OneToMany;

    switch (typeString.toLowerCase()) {
      case '1:1':
      case 'one-to-one':
        return RelationshipType.OneToOne;
      case '1:n':
      case 'one-to-many':
        return RelationshipType.OneToMany;
      case 'n:1':
      case 'many-to-one':
        return RelationshipType.ManyToOne;
      case 'n:n':
      case 'many-to-many':
        return RelationshipType.ManyToMany;
      default:
        return RelationshipType.OneToMany;
    }
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
        return '1:n';
    }
  }

  private formatColumnType(column: TableColumn): string {
    if (column.type === 'VARCHAR' || column.type === 'CHAR') {
      return column.length ? `${column.type}(${column.length})` : column.type;
    }
    return column.type;
  }
}