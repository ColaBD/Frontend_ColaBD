import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface ShareModalData {
    schemaId: string;
    schemaName: string;
}

export interface SharedUser {
    email: string;
    permission: 'viewer' | 'editor';
    name?: string;
    avatar?: string;
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
export class ShareModalComponent implements OnInit {
    @Input() isVisible = false;
    @Input() schemaTitle = '';
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

    constructor(private snackBar: MatSnackBar) {}

    ngOnInit(): void {
        this.loadSharedUsers();
    }

    /**
     * Load existing shared users (mock data for now)
     */
    private loadSharedUsers(): void {
        this.isLoading = true;

        // Simulate API call
        setTimeout(() => {
            this.sharedUsers = [
                {
                    email: 'maria.silva@exemplo.com',
                    permission: 'editor',
                    name: 'Maria Silva',
                    avatar: 'https://ui-avatars.com/api/?name=Maria+Silva&background=4285f4&color=fff'
                }
            ];
            this.isLoading = false;
        }, 500);
    }

    /**
     * Add a new user to share with
     */
    addUser(): void {
        if (!this.newUserEmail.trim()) {
            this.showMessage('Por favor, insira um email válido', 'error');
            return;
        }

        if (!this.isValidEmail(this.newUserEmail)) {
            this.showMessage('Por favor, insira um email válido', 'error');
            return;
        }

        // Check if user already exists
        if (this.sharedUsers.some(user => user.email.toLowerCase() === this.newUserEmail.toLowerCase())) {
            this.showMessage('Este usuário já tem acesso ao schema', 'warning');
            return;
        }

        this.isSaving = true;

        // Simulate API call to add user
        setTimeout(() => {
            const newUser: SharedUser = {
                email: this.newUserEmail.trim(),
                permission: this.newUserPermission,
                name: this.extractNameFromEmail(this.newUserEmail),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.extractNameFromEmail(this.newUserEmail))}&background=random`
            };

            this.sharedUsers.push(newUser);
            this.newUserEmail = '';
            this.newUserPermission = 'viewer';
            this.isSaving = false;

            this.showMessage('Usuário adicionado com sucesso!', 'success');
        }, 1000);
    }

    /**
     * Remove a user from sharing
     */
    removeUser(userEmail: string): void {
        const userIndex = this.sharedUsers.findIndex(user => user.email === userEmail);
        if (userIndex > -1) {
            this.sharedUsers.splice(userIndex, 1);
            this.showMessage('Usuário removido', 'success');
        }
    }

    /**
     * Change user permission
     */
    changeUserPermission(userEmail: string, newPermission: 'viewer' | 'editor'): void {
        const user = this.sharedUsers.find(user => user.email === userEmail);
        if (user) {
            user.permission = newPermission;
            this.showMessage('Permissão atualizada', 'success');
        }
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
     * Get permission display text
     */
    getPermissionText(permission: 'viewer' | 'editor'): string {
        return permission === 'editor' ? 'Pode editar' : 'Pode visualizar';
    }

    /**
     * Get permission icon
     */
    getPermissionIcon(permission: 'viewer' | 'editor'): string {
        return permission === 'editor' ? 'edit' : 'visibility';
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
        }, 1000);
    }

    get canShare(): boolean {
        return this.emailToShare.trim().length > 0 && !this.isSharing;
    }

    /**
     * Handle Enter key press in email input
     */
    onEmailKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addUser();
        }
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
