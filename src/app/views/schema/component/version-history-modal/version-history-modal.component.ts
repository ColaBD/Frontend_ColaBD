import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VersionControlService, SchemaVersion } from '../../services/version-control.service';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
  ],
  templateUrl: './version-history-modal.component.html',
  styleUrls: ['./version-history-modal.component.scss']
})
export class VersionHistoryModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() currentDiagramData: any = null;
  @Input() currentUserEmail: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() restoreVersion = new EventEmitter<any>();

  versions: SchemaVersion[] = [];
  selectedVersion: SchemaVersion | null = null;
  showSaveDialog = false;
  newVersionComment = '';
  isSaving = false;

  constructor(
    private versionControlService: VersionControlService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVersions();
  }

  /**
   * Load versions from service
   */
  private loadVersions(): void {
    this.versionControlService.getVersions().subscribe(versions => {
      this.versions = versions;
    });
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showSaveDialog = false;
    this.newVersionComment = '';
    this.selectedVersion = null;
    this.close.emit();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Open save version dialog
   */
  openSaveDialog(): void {
    this.showSaveDialog = true;
    this.newVersionComment = '';
  }

  /**
   * Cancel save dialog
   */
  cancelSaveDialog(): void {
    this.showSaveDialog = false;
    this.newVersionComment = '';
  }

  /**
   * Save current state as new version
   */
  saveCurrentVersion(): void {
    if (!this.currentDiagramData) {
      this.showMessage('Nenhum dado de diagrama disponível para salvar', 'error');
      return;
    }

    this.isSaving = true;

    this.versionControlService.saveVersion(
      this.currentDiagramData,
      this.currentUserEmail || 'Usuário Anônimo',
      this.newVersionComment.trim() || undefined
    ).subscribe({
      next: () => {
        this.showMessage('Versão salva com sucesso!', 'success');
        this.showSaveDialog = false;
        this.newVersionComment = '';
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error saving version:', error);
        this.showMessage(error.message || 'Erro ao salvar versão', 'error');
        this.isSaving = false;
      }
    });
  }

  /**
   * Handle version click: select and ask confirmation to restore
   */
  onVersionClick(version: SchemaVersion): void {
    this.selectedVersion = version;

    if (!version.isCurrent) {
      this.confirmAndRestoreVersion(version);
    }
  }

  /**
   * Restore selected version
   */
  restoreSelectedVersion(): void {
    if (!this.selectedVersion) {
      return;
    }

    this.confirmAndRestoreVersion(this.selectedVersion);
  }

  /**
   * Delete a version
   */
  deleteVersion(version: SchemaVersion, event: Event): void {
    event.stopPropagation();

    if (version.isCurrent) {
      this.showMessage('Não é possível excluir a versão atual', 'warning');
      return;
    }

    const confirmed = confirm(
      `Deseja excluir esta versão?\n\n` +
      `Data: ${this.formatDate(version.timestamp)}\n` +
      `Autor: ${version.author}\n` +
      `${version.comment ? 'Comentário: ' + version.comment : ''}`
    );

    if (confirmed) {
      const success = this.versionControlService.deleteVersion(version.id);
      if (success) {
        this.showMessage('Versão excluída com sucesso', 'success');
        if (this.selectedVersion?.id === version.id) {
          this.selectedVersion = null;
        }
      } else {
        this.showMessage('Erro ao excluir versão', 'error');
      }
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        if (minutes === 0) {
          return 'Agora mesmo';
        }
        return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
      }
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias atrás`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * Format full date and time
   */
  formatFullDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'agora mesmo';
    } else if (minutes < 60) {
      return `${minutes} min atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else {
      return `${days} dias atrás`;
    }
  }

  /**
   * Track versions for ngFor
   */
  trackVersion(index: number, version: SchemaVersion): string {
    return version.id;
  }

  /**
   * Show snackbar message
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Confirm and restore a given version
   */
  private confirmAndRestoreVersion(version: SchemaVersion): void {
    const confirmed = confirm(
      `Deseja restaurar esta versão?\n\n` +
      `Data: ${this.formatDate(version.timestamp)}\n` +
      `Autor: ${version.author}\n` +
      `${version.comment ? 'Comentário: ' + version.comment : ''}\n\n` +
      `Isso substituirá o estado atual do diagrama.`
    );

    if (confirmed) {
      this.versionControlService.restoreVersion(version.id);
      this.restoreVersion.emit(version.data);
      this.showMessage('Versão restaurada com sucesso!', 'success');
      this.selectedVersion = null;
    }
  }
}






