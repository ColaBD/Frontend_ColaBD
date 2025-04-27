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

interface TableColumn {
  name: string;
  type: string;
  helpText?: string;
}

interface TableDefinition {
  name: string;
  columns: TableColumn[];
  indices?: any[];
  comment?: string;
}

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
    MatExpansionModule
  ],
  templateUrl: './table-editor.component.html',
  styleUrl: './table-editor.component.scss'
})
export class TableEditorComponent implements OnInit {
  tables: TableDefinition[] = [];
  selectedTabIndex = 0;
  dataTypes = ['INT', 'VARCHAR', 'TEXT', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIMESTAMP'];
  
  constructor() { }

  ngOnInit(): void {
    // Initialize with a default table
    this.addTable();
  }

  addTable(): void {
    const newTable: TableDefinition = {
      name: `Tabela ${this.tables.length + 1}`,
      columns: [
        { name: 'A1', type: 'INT' },
        { name: 'Name', type: '' },
        { name: 'Name', type: '' },
        { name: 'Name', type: 'FLOAT' },
        { name: 'Name', type: '' }
      ],
      indices: [],
      comment: ''
    };
    
    this.tables.push(newTable);
    this.selectedTabIndex = this.tables.length - 1;
  }

  addColumn(table: TableDefinition): void {
    table.columns.push({ name: 'Name', type: '' });
  }

  removeColumn(table: TableDefinition, index: number): void {
    table.columns.splice(index, 1);
  }

  addIndex(table: TableDefinition): void {
    if (!table.indices) {
      table.indices = [];
    }
    table.indices.push({
      name: `index_${table.indices.length + 1}`,
      columns: []
    });
  }

  // Generate SQL for the table
  generateSql(table: TableDefinition): string {
    // This would generate the SQL statement based on the table definition
    return `CREATE TABLE ${table.name} (\n  // columns definition\n);`;
  }
} 