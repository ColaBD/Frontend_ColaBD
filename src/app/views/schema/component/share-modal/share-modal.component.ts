import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SchemaApiService, SchemaCollaborator } from '../../services/schema-api.service';

export interface ShareModalData {
    schemaId: string;
    schemaName: string;
}

export interface SharedUser {
    id: string;
    email: string;
    name: string;
    avatar: string;
}

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatChipsModule,
        MatSnackBarModule,
    ],
    templateUrl: './share-modal.component.html',
    styleUrls: ['./share-modal.component.scss']
})
export class ShareModalComponent implements OnInit, OnChanges {
    @Input() isVisible = false;
    @Input() schemaTitle = '';
    @Input() schemaId: string | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() shareWithUser = new EventEmitter<{ email: string; permission: 'viewer' | 'editor' }>();

    emailToShare = '';
    isSharing = false;
    isEmailValid = true;
    newUserEmail = '';
    newUserPermission: 'viewer' | 'editor' = 'viewer';
    sharedUsers: SharedUser[] = [];
    isLoading = false;
    isSaving = false;

    constructor(
        private snackBar: MatSnackBar,
        private schemaApiService: SchemaApiService
    ) {}

    ngOnInit(): void {
        // Don't load on init - wait for modal to open
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Only reload when modal becomes visible (opens)
        if (changes['isVisible']) {
            if (this.isVisible && this.schemaId) {
                // Modal just opened - load collaborators in background
                this.loadSharedUsers();
            } else if (!this.isVisible) {
                // Modal closed - reset state
                this.resetModalState();
            }
        }
    }

    /**
     * Reset modal state when closing
     */
    private resetModalState(): void {
        this.emailToShare = '';
        this.isEmailValid = true;
        this.isSharing = false;
        // Keep sharedUsers to avoid flickering on reopen
    }

    /**
     * Load existing shared users from API (runs in background)
     */
    private loadSharedUsers(): void {
        if (!this.schemaId) {
            return;
        }

        this.isLoading = true;
        this.sharedUsers = []; // Clear previous data

        this.schemaApiService.getSchemaCollaborators(this.schemaId).subscribe({
            next: (collaborators: SchemaCollaborator[]) => {
                this.sharedUsers = collaborators.map(collab => ({
                    id: collab.id,
                    email: collab.user.email,
                    name: collab.user.name,
                    avatar: collab.signed_image_url || this.generateAvatarUrl(collab.user.name)
                }));
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Erro ao carregar colaboradores:', error);
                this.showMessage('Erro ao carregar colaboradores', 'error');
                this.sharedUsers = [];
                this.isLoading = false;
            }
        });
    }

    /**
     * Generate avatar URL from user name
     */
    private generateAvatarUrl(name: string): string {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }


    /**
     * Copy share link to clipboard
     */
    copyLink(): void {
        const shareLink = `${window.location.origin}/schema/${this.schemaTitle}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareLink).then(() => {
                this.showMessage('Link copiado para a área de transferência!', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(shareLink);
            });
        } else {
            this.fallbackCopyToClipboard(shareLink);
        }
    }

    /**
     * Fallback method to copy to clipboard
     */
    private fallbackCopyToClipboard(text: string): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showMessage('Link copiado para a área de transferência!', 'success');
        } catch (err) {
            this.showMessage('Não foi possível copiar o link', 'error');
        }

        document.body.removeChild(textArea);
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Extract name from email
     */
    private extractNameFromEmail(email: string): string {
        const localPart = email.split('@')[0];
        return localPart.split('.').map(part =>
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
    }


    /**
     * Close modal
     */
    closeModal(): void {
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
     * Share with user
     */
    onShare(): void {
        if (!this.emailToShare.trim()) {
            this.isEmailValid = false;
            return;
        }

        if (!this.isValidEmail(this.emailToShare)) {
            this.isEmailValid = false;
            return;
        }

        // Check if user already exists
        if (this.sharedUsers.some(user => user.email.toLowerCase() === this.emailToShare.toLowerCase())) {
            this.showMessage('Este usuário já tem acesso ao schema', 'warning');
            return;
        }

        this.isEmailValid = true;
        this.isSharing = true;

        // Emit the share event
        this.shareWithUser.emit({
            email: this.emailToShare,
            permission: 'editor'
        });

        setTimeout(() => {
            this.isSharing = false;
            this.emailToShare = '';
            this.showMessage('Schema compartilhado com sucesso!', 'success');
            // Reload collaborators list
            this.loadSharedUsers();
        }, 1000);
    }

    get canShare(): boolean {
        return this.emailToShare.trim().length > 0 && !this.isSharing;
    }


    /**
     * Track function for ngFor
     */
    trackUser(index: number, user: SharedUser): string {
        return user.email;
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
}
