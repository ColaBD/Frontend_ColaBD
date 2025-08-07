import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { JointJSGraph } from './jointjs-data.interface';
import { SchemaApiService } from './schema-api.service';
import { SchemaListItem, SchemaDetailsResponse } from '../models/schema-api.models';

@Injectable({
  providedIn: 'root'
})
export class SchemaBackendService {
  private readonly baseUrl = '/api/schema'; // Fallback URL for future endpoints

  constructor(
    private http: HttpClient,
    private schemaApiService: SchemaApiService
  ) { }

  /**
   * Load schema from dashboard backend by ID
   */
  loadSchema(schemaId?: string): Observable<JointJSGraph> {
    if (schemaId) {
      return this.schemaApiService.getSchemaById(schemaId).pipe(
        map((response: SchemaDetailsResponse) => ({
          cells: response.cells
        }))
      );
    } else {
      // Fallback to mock data when no specific schema ID is provided
      return this.loadMockSchema();
    }
  }

  /**
   * Get all schemas from dashboard backend
   */
  listSchemas(): Observable<SchemaListItem[]> {
    return this.schemaApiService.getAllSchemas();
  }

  /**
   * Get schema details by ID (includes metadata + cells)
   */
  getSchemaDetails(schemaId: string): Observable<SchemaDetailsResponse> {
    return this.schemaApiService.getSchemaById(schemaId);
  }

  /**
   * Save schema to backend (placeholder - will need implementation based on dashboard API)
   */
  saveSchema(schema: JointJSGraph, schemaId?: string): Observable<{ id: string, message: string }> {
    if (schemaId) {
      // Update existing schema using the schema API service
      return this.schemaApiService.saveSchema(schemaId, schema.cells).pipe(
        map(response => ({
          id: schemaId,
          message: response.message || 'Schema saved successfully'
        }))
      );
    } else {
      // Create new schema - placeholder implementation (would need schema creation endpoint)
      return this.http.post<{ id: string, message: string }>(this.baseUrl, schema);
    }
  }

  /**
   * Delete schema (placeholder - will need implementation based on dashboard API)
   */
  deleteSchema(schemaId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${schemaId}`);
  }

  /**
   * Mock method for development - returns sample data
   * Remove this when you have a real backend
   */
  loadMockSchema(): Observable<JointJSGraph> {
    const mockSchema: JointJSGraph = {
      cells: [
        {
          type: 'standard.Rectangle',
          id: 'table_users',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 146 },
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
            'row@2-meta': { pk: false, fk: false },
            'row@3-name': { text: 'created_at' },
            'row@3-type': { text: 'TIMESTAMP' },
            'row@3-meta': { pk: false, fk: false }
          }
        },
        {
          type: 'standard.Rectangle',
          id: 'table_orders',
          position: { x: 400, y: 100 },
          size: { width: 200, height: 146 },
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
            'row@2-meta': { pk: false, fk: false },
            'row@3-name': { text: 'status' },
            'row@3-type': { text: 'VARCHAR(50)' },
            'row@3-meta': { pk: false, fk: false }
          }
        },
        {
          type: 'standard.Rectangle',
          id: 'table_products',
          position: { x: 700, y: 100 },
          size: { width: 200, height: 120 },
          attrs: {
            label: { text: 'Products' },
            'row@0-name': { text: 'id' },
            'row@0-type': { text: 'INT' },
            'row@0-meta': { pk: true, fk: false },
            'row@1-name': { text: 'name' },
            'row@1-type': { text: 'VARCHAR(255)' },
            'row@1-meta': { pk: false, fk: false },
            'row@2-name': { text: 'price' },
            'row@2-type': { text: 'DECIMAL(10,2)' },
            'row@2-meta': { pk: false, fk: false }
          }
        },
        {
          type: 'standard.Rectangle',
          id: 'table_order_items',
          position: { x: 400, y: 300 },
          size: { width: 200, height: 146 },
          attrs: {
            label: { text: 'Order Items' },
            'row@0-name': { text: 'id' },
            'row@0-type': { text: 'INT' },
            'row@0-meta': { pk: true, fk: false },
            'row@1-name': { text: 'order_id' },
            'row@1-type': { text: 'INT' },
            'row@1-meta': { pk: false, fk: true },
            'row@2-name': { text: 'product_id' },
            'row@2-type': { text: 'INT' },
            'row@2-meta': { pk: false, fk: true },
            'row@3-name': { text: 'quantity' },
            'row@3-type': { text: 'INT' },
            'row@3-meta': { pk: false, fk: false }
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
        },
        {
          type: 'standard.Link',
          id: 'rel_orders_order_items',
          source: { id: 'table_orders' },
          target: { id: 'table_order_items' },
          labels: [{
            attrs: {
              text: { text: '1:n' }
            },
            position: 0.5
          }]
        },
        {
          type: 'standard.Link',
          id: 'rel_products_order_items',
          source: { id: 'table_products' },
          target: { id: 'table_order_items' },
          labels: [{
            attrs: {
              text: { text: '1:n' }
            },
            position: 0.5
          }]
        }
      ]
    };

    return of(mockSchema);
  }
}