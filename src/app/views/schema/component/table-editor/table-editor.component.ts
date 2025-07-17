import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { SchemaService, TableDefinition, TableColumn, TableIndex } from '../../services/schema.service';
import { ScrollingModule } from '@angular/cdk/scrolling';


@Component({
  selector: 'app-table-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    MatTabsModule,
    MatExpansionModule,
    ScrollingModule
  ],
  templateUrl: './table-editor.component.html',
  styleUrl: './table-editor.component.scss'
})
export class TableEditorComponent implements OnInit {
  tables: TableDefinition[] = [];
  selectedTabIndex = 0; // 0 = Tables, 1 = Indexes
  dataTypes = ['INT', 'VARCHAR', 'CHAR', 'TEXT', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIMESTAMP'];
  indexTypes = ['BTREE', 'HASH', 'FULLTEXT', 'SPATIAL'];
  
  constructor(private schemaService: SchemaService) { }

  get totalIndexesCount(): number {
    return this.tables.reduce((total, table) => total + (table.indices?.length || 0), 0);
  }

  ngOnInit(): void {
    // Get tables from service
    this.schemaService.getTables().subscribe(tables => {
      this.tables = tables;
    });
    
    // If no tables exist, add a default one
    if (this.tables.length === 0) {
      this.addTable();
    }
  }

  addTable(): void {
    const newTable: TableDefinition = {
      id: '',
      name: `Tabela ${this.tables.length + 1}`,
      columns: [
        { name: 'ID', type: 'INT' }
      ]
    };
    
    // Add table to the service
    this.schemaService.addTable(newTable);
    this.selectedTabIndex = 0;
  }

  addColumn(table: TableDefinition): void {
    const newColumn: TableColumn = { 
      name: 'Name', 
      type: '' 
    };
    table.columns.push(newColumn);
    this.schemaService.updateTable(table);
  }

  removeColumn(table: TableDefinition, index: number): void {
    table.columns.splice(index, 1);
    this.schemaService.updateTable(table);
  }

  updateTable(table: TableDefinition): void {
    this.schemaService.updateTable(table);
  }

  onTypeChange(table: TableDefinition, column: TableColumn): void {
    // Set default length for VARCHAR/CHAR if not already set
    if ((column.type === 'VARCHAR' || column.type === 'CHAR') && !column.length) {
      column.length = column.type === 'VARCHAR' ? 255 : 50; // Default lengths
    }
    
    // Clear length for types that don't need it
    if (column.type !== 'VARCHAR' && column.type !== 'CHAR') {
      column.length = undefined;
    }
    
    this.updateTable(table);
  }

  onLengthChange(table: TableDefinition, column: TableColumn): void {
    // Validate length for VARCHAR/CHAR
    if ((column.type === 'VARCHAR' || column.type === 'CHAR') && column.length) {
      // Ensure length is within valid range
      if (column.length < 1) {
        column.length = 1;
      } else if (column.length > 65535) {
        column.length = 65535;
      }
    }
    
    this.updateTable(table);
  }

  removeTable(tableId: string, index: number): void {
    this.schemaService.removeTable(tableId);
  }

  togglePrimaryKey(table: TableDefinition, columnIndex: number): void {
    // Toggle the isPrimaryKey property
    table.columns[columnIndex].isPrimaryKey = !table.columns[columnIndex].isPrimaryKey;
    
    // Primary keys should always be NOT NULL and UNIQUE
    if (table.columns[columnIndex].isPrimaryKey) {
      table.columns[columnIndex].isNotNull = true;
      table.columns[columnIndex].isUnique = true;
    }
    
    // Update the table in the service
    this.schemaService.updateTable(table);
  }

  toggleNotNull(table: TableDefinition, columnIndex: number): void {
    // Don't allow unchecking NOT NULL for primary keys
    if (table.columns[columnIndex].isPrimaryKey && table.columns[columnIndex].isNotNull) {
      return; // Primary keys must always be NOT NULL
    }
    
    // Toggle the isNotNull property
    table.columns[columnIndex].isNotNull = !table.columns[columnIndex].isNotNull;
    
    // Update the table in the service
    this.schemaService.updateTable(table);
  }

  toggleUnique(table: TableDefinition, columnIndex: number): void {
    // Don't allow unchecking UNIQUE for primary keys
    if (table.columns[columnIndex].isPrimaryKey && table.columns[columnIndex].isUnique) {
      return; // Primary keys must always be UNIQUE
    }
    
    // Toggle the isUnique property
    table.columns[columnIndex].isUnique = !table.columns[columnIndex].isUnique;
    
    // Update the table in the service
    this.schemaService.updateTable(table);
  }

  addIndex(table: TableDefinition): void {
    const newIndex: TableIndex = {
      id: '',
      name: `index_${(table.indices?.length || 0) + 1}`,
      columns: [],
      type: 'BTREE',
      isUnique: false
    };
    
    this.schemaService.addIndex(table.id, newIndex);
  }

  updateIndex(table: TableDefinition, index: TableIndex): void {
    this.schemaService.updateIndex(table.id, index.id, index);
  }

  removeIndex(table: TableDefinition, indexId: string): void {
    this.schemaService.removeIndex(table.id, indexId);
  }

  handleIndexColumnChange(event: Event, table: TableDefinition, index: TableIndex, columnName: string): void {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;
    this.onIndexColumnChange(table, index, columnName, isChecked);
  }

  onIndexColumnChange(table: TableDefinition, index: TableIndex, columnName: string, isChecked: boolean): void {
    if (isChecked) {
      if (!index.columns.includes(columnName)) {
        index.columns.push(columnName);
      }
    } else {
      index.columns = index.columns.filter(col => col !== columnName);
    }
    this.updateIndex(table, index);
  }

  // Generate SQL for the table
  generateSql(table: TableDefinition): string {
    // This would generate the SQL statement based on the table definition
    return `CREATE TABLE ${table.name} (\n  // columns definition\n);`;
  }
} 