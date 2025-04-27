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
import { SchemaService, TableDefinition, TableColumn } from '../../services/schema.service';
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
  selectedTabIndex = 0;
  dataTypes = ['INT', 'VARCHAR', 'TEXT', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIMESTAMP'];
  
  constructor(private schemaService: SchemaService) { }

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
    this.selectedTabIndex = this.tables.length - 1;
  }

  addColumn(table: TableDefinition): void {
    table.columns.push({ name: 'Name', type: '' });
    this.schemaService.updateTable(table);
  }

  removeColumn(table: TableDefinition, index: number): void {
    table.columns.splice(index, 1);
    this.schemaService.updateTable(table);
  }

  updateTable(table: TableDefinition): void {
    this.schemaService.updateTable(table);
  }

  removeTable(tableId: string, index: number): void {
    this.schemaService.removeTable(tableId);
    
    // Adjust selected tab if necessary
    if (this.selectedTabIndex === index && this.tables.length > 0) {
      this.selectedTabIndex = Math.max(0, index - 1);
    }
  }

  addIndex(table: TableDefinition): void {
    if (!table.indices) {
      table.indices = [];
    }
    
    table.indices.push({
      name: `index_${table.indices.length + 1}`,
      columns: []
    });
    
    this.schemaService.updateTable(table);
  }

  // Generate SQL for the table
  generateSql(table: TableDefinition): string {
    // This would generate the SQL statement based on the table definition
    return `CREATE TABLE ${table.name} (\n  // columns definition\n);`;
  }
} 