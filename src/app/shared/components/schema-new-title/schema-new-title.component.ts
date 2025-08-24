import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-schema-new-title',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './schema-new-title.component.html',
  styleUrl: './schema-new-title.component.scss'
})

export class SchemaNewTitleComponent {
  title: string = '';
  tituloCard: string = '';
  tituloBtnConfirmar: string = '';
  
  constructor(
    public dialogRef: MatDialogRef<SchemaNewTitleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.tituloCard = data?.isUpdate ? 'Atualizar Nome do Schema' : 'Criar Novo Schema';
    this.tituloBtnConfirmar = data?.isUpdate ? 'Atualizar Schema' : 'Criar Schema';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.title.trim()) {
      this.dialogRef.close(this.title.trim());
    }
  }
}
