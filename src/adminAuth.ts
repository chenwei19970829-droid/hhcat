// Store Owner Authentication Utility for 花花招財貓
// Restricts upload & photo management features strictly to the store owner

const AUTH_STORAGE_KEY = 'hhcat_store_owner_auth_v1';
const AUTH_CHANGE_EVENT = 'hhcat_owner_auth_change';

// Accepted owner credentials - strictly restricted to store owner
const VALID_PASSKEYS = [
  'david19970829'
];

/**
 * Checks whether the current session has verified store owner credentials
 */
export const isStoreOwnerLoggedIn = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Validates the entered passkey against owner credentials
 */
export const verifyStoreOwnerPasskey = (passkey: string): boolean => {
  if (!passkey) return false;
  const normalized = passkey.trim().toLowerCase();
  return VALID_PASSKEYS.includes(normalized);
};

/**
 * Authenticates the store owner and saves state to localStorage
 */
export const loginStoreOwner = (passkey: string): boolean => {
  if (verifyStoreOwnerPasskey(passkey)) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      return true;
    } catch (e) {
      console.warn('Failed to save owner auth to localStorage', e);
      return true;
    }
  }
  return false;
};

/**
 * Logs out the store owner and locks upload privileges
 */
export const logoutStoreOwner = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (e) {
    console.warn('Failed to clear owner auth', e);
  }
};

/**
 * React hook to subscribe to store owner login status
 */
import { useState, useEffect } from 'react';

export const useStoreOwner = () => {
  const [isOwner, setIsOwner] = useState<boolean>(() => isStoreOwnerLoggedIn());

  useEffect(() => {
    const handleUpdate = () => {
      setIsOwner(isStoreOwnerLoggedIn());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    isOwner,
    login: loginStoreOwner,
    logout: logoutStoreOwner,
    verify: verifyStoreOwnerPasskey
  };
};
