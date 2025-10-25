export interface LockInfo {
  element_id: string;
  user_id: string;
  locked_by_user: boolean;
  expires_at: string;
}

export interface LockResponse {
  success: boolean;
  element_id: string;
  user_id: string;
  locked_by_user: boolean;
  message: string;
  expires_at: string;
}

export interface LockedElementNotification {
  element_id: string;
  user_id: string;
  expires_at: string;
}

export interface UnlockedElementNotification {
  element_id: string;
  reason?: string;
}

export interface LockedElementsList {
  locked_elements: LockInfo[];
}

export enum LockStatus {
  UNLOCKED = 'unlocked',
  LOCKED_BY_OTHER = 'locked_by_other',
  LOCKED_BY_ME = 'locked_by_me',
}
