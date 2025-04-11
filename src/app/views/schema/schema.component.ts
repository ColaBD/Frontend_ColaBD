import { Component } from '@angular/core';
import { FooterService } from '../../core/footer/services/footer.service';
import { HighlightModule } from 'ngx-highlightjs';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from "./component/code-editor/code-editor.component";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-schema',
  imports: [HighlightModule, FormsModule, CodeEditorComponent, MatIconModule, MatButtonModule],
  templateUrl: './schema.component.html',
  styleUrl: './schema.component.scss',
})
export class SchemaComponent {

  constructor(private footerService: FooterService) { }

  ngOnInit() {
    this.footerService.setFooterVisibility(false); //adicionar isso para esconder o footer
  }

  ngOnDestroy() {
    this.footerService.setFooterVisibility(true); //adicionar isso para voltar a aparecer o footer
  }
}
