import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SchemaApiService } from '../../services/schema-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DatabaseType = 'mysql' | 'postgresql';

@Component({
    selector: 'app-sql-generator-modal',
    imports: [CommonModule, FormsModule],
    templateUrl: './sql-generator-modal.component.html',
    styleUrl: './sql-generator-modal.component.scss',
    standalone: true
})
export class SqlGeneratorModalComponent {
    @Input() isVisible = false;
    @Input() schemaTitle = '';
    @Input() schema = '';
    @Output() close = new EventEmitter<void>();
    @Output() generateSQL = new EventEmitter<DatabaseType>();

    selectedDatabase: DatabaseType = 'mysql';
    isGenerating = false;

    databaseOptions = [
        { value: 'mysql' as DatabaseType, label: 'MySQL', icon: 'bi-database' },
        { value: 'postgresql' as DatabaseType, label: 'PostgreSQL', icon: 'bi-database-fill' }
    ];

    closeModal() {
        this.close.emit();
        this.selectedDatabase = 'mysql'; // Reset to default
    }

    onBackdropClick(event: Event) {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }

    constructor(private schemaApiService: SchemaApiService) {}

    async onGenerate() {
        if (this.isGenerating) return;
        this.isGenerating = true;

        try {
            const schemaString = typeof this.schema === 'string' ? this.schema : JSON.stringify(this.schema);
            const data = await this.schemaApiService.generateSQL(schemaString, this.selectedDatabase).toPromise();
            if (!data?.url) throw new Error('Resposta inválida do servidor: url ausente');
            window.location.href = data.url as string;
            this.closeModal();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao gerar SQL';
            alert(message);
        } finally {
            this.isGenerating = false;
        }
    }

    onDatabaseChange(database: DatabaseType) {
        this.selectedDatabase = database;
    }

    // Method to be called from parent when generation is complete
    onGenerationComplete() {
        this.isGenerating = false;
        this.closeModal();
    }
}
