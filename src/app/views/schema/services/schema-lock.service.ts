import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  LockInfo, 
  LockResponse, 
  LockedElementNotification, 
  UnlockedElementNotification, 
  LockedElementsList,
  LockStatus 
} from '../models/schema-lock.models';
import { SchemaApiWebsocketService } from './colaborative/schema-api-websocket.service';

interface LockState {
  [elementId: string]: {
    lockInfo: LockInfo;
    status: LockStatus;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SchemaLockService {
  private lockState: BehaviorSubject<LockState> = new BehaviorSubject<LockState>({});
  private schemaId: string | null = null;
  private currentUserId: string | null = null;
  private lockRenewalTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly LOCK_TTL_SECONDS = 30;
  private readonly LOCK_RENEWAL_INTERVAL = 20; // Renovar a cada 20 segundos

  constructor(private socketService: SchemaApiWebsocketService) {}

  initialize(schemaId: string | null, userId: string | null): void {
    this.schemaId = schemaId;
    this.currentUserId = userId;
    
    if (schemaId) {
      this.setupLockListeners();
      this.getLockedElements();
    }
  }

  private setupLockListeners(): void {
    if (!this.schemaId) return;

    // Listen for lock response
    (this.socketService as any).socket?.on(
      `lock_response_${this.schemaId}`,
      (data: LockResponse) => this.handleLockResponse(data)
    );

    // Listen for element locked notification from other users
    (this.socketService as any).socket?.on(
      `element_locked_${this.schemaId}`,
      (data: LockedElementNotification) => this.handleElementLocked(data)
    );

    // Listen for element unlocked notification
    (this.socketService as any).socket?.on(
      `element_unlocked_${this.schemaId}`,
      (data: UnlockedElementNotification) => this.handleElementUnlocked(data)
    );

    // Listen for locked elements list
    (this.socketService as any).socket?.on(
      `locked_elements_${this.schemaId}`,
      (data: LockedElementsList) => this.handleLockedElementsList(data)
    );
  }

  private handleLockResponse(response: LockResponse): void {
    const currentState = this.lockState.value;
    
    if (response.success && response.locked_by_user) {
      // Lock acquired successfully
      currentState[response.element_id] = {
        lockInfo: {
          element_id: response.element_id,
          user_id: response.user_id,
          locked_by_user: true,
          expires_at: response.expires_at,
        },
        status: LockStatus.LOCKED_BY_ME,
      };

      // Setup auto-renewal for my locks
      this.setupLockRenewal(response.element_id);
    } else if (!response.success) {
      // Lock failed - element locked by another user
      currentState[response.element_id] = {
        lockInfo: {
          element_id: response.element_id,
          user_id: response.user_id,
          locked_by_user: false,
          expires_at: response.expires_at,
        },
        status: LockStatus.LOCKED_BY_OTHER,
      };
    }

    this.lockState.next(currentState);
  }

  private handleElementLocked(notification: LockedElementNotification): void {
    const currentState = this.lockState.value;
    
    currentState[notification.element_id] = {
      lockInfo: {
        element_id: notification.element_id,
        user_id: notification.user_id,
        locked_by_user: false,
        expires_at: notification.expires_at,
      },
      status: LockStatus.LOCKED_BY_OTHER,
    };

    this.lockState.next(currentState);
  }

  private handleElementUnlocked(notification: UnlockedElementNotification): void {
    const currentState = this.lockState.value;
    
    // Clear renewal timeout if exists
    const timeout = this.lockRenewalTimeouts.get(notification.element_id);
    if (timeout) {
      clearTimeout(timeout);
      this.lockRenewalTimeouts.delete(notification.element_id);
    }

    delete currentState[notification.element_id];
    this.lockState.next(currentState);
  }

  private handleLockedElementsList(data: LockedElementsList): void {
    const currentState: LockState = {};

    data.locked_elements.forEach(lock => {
      const isLockedByMe = lock.locked_by_user;
      currentState[lock.element_id] = {
        lockInfo: lock,
        status: isLockedByMe ? LockStatus.LOCKED_BY_ME : LockStatus.LOCKED_BY_OTHER,
      };

      // Setup renewal for my locks
      if (isLockedByMe) {
        this.setupLockRenewal(lock.element_id);
      }
    });

    this.lockState.next(currentState);
  }

  private setupLockRenewal(elementId: string): void {
    // Clear existing timeout if any
    const existingTimeout = this.lockRenewalTimeouts.get(elementId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Setup new renewal timeout
    const timeout = setTimeout(() => {
      this.renewLock(elementId);
    }, this.LOCK_RENEWAL_INTERVAL * 1000);

    this.lockRenewalTimeouts.set(elementId, timeout);
  }

  private renewLock(elementId: string): void {
    const currentState = this.lockState.value;
    const lockEntry = currentState[elementId];

    if (lockEntry && lockEntry.status === LockStatus.LOCKED_BY_ME) {
      // Emit lock again to renew (backend will extend TTL)
      this.acquireLock(elementId);
    }
  }

  acquireLock(elementId: string, ttlSeconds: number = this.LOCK_TTL_SECONDS): void {
    if (!this.schemaId) return;

    const eventName = `lock_element_${this.schemaId}`;
    (this.socketService as any).socket?.emit(eventName, {
      element_id: elementId,
      ttl_seconds: ttlSeconds,
    });
  }

  releaseLock(elementId: string): void {
    if (!this.schemaId) return;

    // Clear renewal timeout
    const timeout = this.lockRenewalTimeouts.get(elementId);
    if (timeout) {
      clearTimeout(timeout);
      this.lockRenewalTimeouts.delete(elementId);
    }

    const eventName = `unlock_element_${this.schemaId}`;
    (this.socketService as any).socket?.emit(eventName, {
      element_id: elementId,
    });
  }

  private getLockedElements(): void {
    if (!this.schemaId) return;

    const eventName = `get_locked_elements_${this.schemaId}`;
    (this.socketService as any).socket?.emit(eventName, {});
  }

  getLockState(): Observable<LockState> {
    return this.lockState.asObservable();
  }

  getLockStatus(elementId: string): LockStatus {
    const state = this.lockState.value[elementId];
    return state?.status ?? LockStatus.UNLOCKED;
  }

  getLockInfo(elementId: string): LockInfo | null {
    const state = this.lockState.value[elementId];
    return state?.lockInfo ?? null;
  }

  isElementLockedByOther(elementId: string): boolean {
    return this.getLockStatus(elementId) === LockStatus.LOCKED_BY_OTHER;
  }

  isElementLockedByMe(elementId: string): boolean {
    return this.getLockStatus(elementId) === LockStatus.LOCKED_BY_ME;
  }

  getLockedByUserId(elementId: string): string | null {
    const lockInfo = this.getLockInfo(elementId);
    return lockInfo?.user_id ?? null;
  }

  getExpiresAt(elementId: string): Date | null {
    const lockInfo = this.getLockInfo(elementId);
    if (!lockInfo) return null;
    return new Date(lockInfo.expires_at);
  }

  destroy(): void {
    // Clear all renewal timeouts
    this.lockRenewalTimeouts.forEach(timeout => clearTimeout(timeout));
    this.lockRenewalTimeouts.clear();
    
    // Release all my locks
    const currentState = this.lockState.value;
    Object.keys(currentState).forEach(elementId => {
      const entry = currentState[elementId];
      if (entry.status === LockStatus.LOCKED_BY_ME) {
        this.releaseLock(elementId);
      }
    });

    this.lockState.complete();
  }
}
