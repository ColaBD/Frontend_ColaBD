import { Component } from '@angular/core';
import { FooterService } from '../../core/footer/services/footer.service';
import { HighlightModule } from 'ngx-highlightjs';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from "./component/code-editor/code-editor.component";
import { TableEditorComponent } from './component/table-editor/table-editor.component';
import { DiagramComponent } from './component/diagram/diagram.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schema',
  imports: [
    CommonModule,
    HighlightModule, 
    FormsModule, 
    CodeEditorComponent, 
    TableEditorComponent, 
    DiagramComponent,
    MatIconModule, 
    MatButtonModule
  ],
  templateUrl: './schema.component.html',
  styleUrl: './schema.component.scss',
})
export class SchemaComponent {
  activeEditor: 'table' | 'code' = 'table';

  constructor(private footerService: FooterService) { }

  ngOnInit() {
    this.footerService.setFooterVisibility(false); //adicionar isso para esconder o footer
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true); //adicionar isso para voltar a aparecer o footer
  }

  setActiveEditor(editor: 'table' | 'code') {
    this.activeEditor = editor;
  }
}
