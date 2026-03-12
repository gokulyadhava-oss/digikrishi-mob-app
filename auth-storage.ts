import * as SecureStore from 'expo-secure-store';

type StoredUser = {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
};

const TOKEN_KEY = 'dk_auth_token_v1';
const USER_KEY  = 'dk_auth_user_v1';

export async function saveAuth(token: string, user: StoredUser) {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
  } catch {
    // Best-effort only; do not crash the app if secure storage is unavailable.
  }
}

export async function loadAuth(): Promise<{ token: string | null; user: StoredUser | null }> {
  try {
    const [token, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (!token || !userJson) {
      return { token: null, user: null };
    }
    try {
      const parsed = JSON.parse(userJson) as StoredUser;
      return { token, user: parsed };
    } catch {
      return { token: null, user: null };
    }
  } catch {
    return { token: null, user: null };
  }
}

export async function clearAuth() {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  } catch {
    // Ignore; next launch will behave as logged-out.
  }
}

