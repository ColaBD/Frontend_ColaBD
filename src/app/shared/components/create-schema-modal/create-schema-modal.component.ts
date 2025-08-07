import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-create-schema-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="create-schema-modal">
      <h2 mat-dialog-title>Create New Schema</h2>
      
      <mat-dialog-content>
        <p>Enter a title for your new database schema:</p>
        
        <mat-form-field class="w-100">
          <mat-label>Schema Title</mat-label>
          <input 
            matInput 
            [(ngModel)]="title" 
            placeholder="e.g., E-commerce Database"
            (keydown.enter)="onCreate()"
            #titleInput
            maxlength="100">
          <mat-hint>{{title.length}}/100</mat-hint>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()"
          type="button">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary"
          (click)="onCreate()"
          [disabled]="!title.trim()"
          type="button">
          Create Schema
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .create-schema-modal {
      min-width: 400px;
    }
    
    mat-dialog-content {
      padding: 20px 0;
    }
    
    .w-100 {
      width: 100%;
    }
    
    mat-form-field {
      margin-bottom: 16px;
    }
  `]
})
export class CreateSchemaModalComponent {
  title: string = '';

  constructor(
    public dialogRef: MatDialogRef<CreateSchemaModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.title.trim()) {
      this.dialogRef.close(this.title.trim());
    }
  }
}
