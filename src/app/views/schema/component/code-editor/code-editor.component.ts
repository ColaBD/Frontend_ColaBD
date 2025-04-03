import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.scss'
})
export class CodeEditorComponent implements AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  monaco: any;

  async ngAfterViewInit() {
    this.monaco = await this.loadMonaco();
    this.monaco.editor.create(this.editorContainer.nativeElement, {
      value: `CREATE TABLE clientes (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(15),
    endereco TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
      language: 'sql',
      theme: 'vs-dark',
      padding: { top: 20, bottom: 20 }
    });
  }

  private async loadMonaco() {
    return new Promise<typeof this.monaco>(resolve => {
      if ((window as any).monaco) {
        resolve((window as any).monaco);
        return;
      }

      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs/loader.min.js';
      loaderScript.onload = () => {
        (window as any).require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs' } });
        (window as any).require(['vs/editor/editor.main'], () => {
          resolve((window as any).monaco);
        });
      };
      document.body.appendChild(loaderScript);
    });
  }
}
