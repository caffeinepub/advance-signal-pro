import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  pinHash: string;
  registeredAt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSyncing: boolean;
  login: (
    email: string,
    pin: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pin: string) => Promise<AuthUser>;
  logout: () => void;
  updateDisplayName: (name: string) => void;
  setActor: (actor: ActorLike | null) => void;
}

// Actor interface — only the methods we need for auth persistence
interface ActorLike {
  saveCallerUserProfile(profile: {
    name: string;
    email?: string;
  }): Promise<void>;
  getCallerUserProfile(): Promise<{
    name: string;
    email?: string;
  } | null>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "asp_auth_user";
// Prefix used to embed auth data inside the backend UserProfile.name field
// Format: "ASP_AUTH:<base64-encoded-json>"
const PROFILE_NAME_PREFIX = "ASP_AUTH:";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateTraderName(): string {
  const digits = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `Trader_${digits}`;
}

export function generateUserId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function hashPin(pin: string): string {
  return btoa(pin);
}

function verifyPin(pin: string, hash: string): boolean {
  return btoa(pin) === hash;
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthUser;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveUserLocal(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

// Encode user data for storage in backend UserProfile.name field
function encodeUserForProfile(user: AuthUser): string {
  const data = {
    u: user.userId,
    e: user.email,
    d: user.displayName,
    p: user.pinHash,
    r: user.registeredAt,
  };
  return PROFILE_NAME_PREFIX + btoa(JSON.stringify(data));
}

// Decode user data from backend UserProfile.name field
function decodeUserFromProfile(nameField: string): AuthUser | null {
  try {
    if (!nameField.startsWith(PROFILE_NAME_PREFIX)) return null;
    const json = atob(nameField.slice(PROFILE_NAME_PREFIX.length));
    const data = JSON.parse(json);
    return {
      userId: data.u,
      email: data.e,
      displayName: data.d,
      pinHash: data.p,
      registeredAt: data.r,
    };
  } catch {
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const actorRef = useRef<ActorLike | null>(null);

  const setActor = useCallback((actor: ActorLike | null) => {
    actorRef.current = actor;
  }, []);

  // Sync user data to backend whenever authenticated + actor is available
  const syncToBackend = useCallback(async (authUser: AuthUser) => {
    const actor = actorRef.current;
    if (!actor) return;
    try {
      await actor.saveCallerUserProfile({
        name: encodeUserForProfile(authUser),
        email: authUser.email,
      });
    } catch {
      // ignore — best-effort sync
    }
  }, []);

  // Try to recover user from backend when not in localStorage
  const recoverFromBackend = useCallback(
    async (emailHint: string): Promise<AuthUser | null> => {
      const actor = actorRef.current;
      if (!actor) return null;
      try {
        setIsSyncing(true);
        const profile = await actor.getCallerUserProfile();
        if (profile?.name) {
          const decoded = decodeUserFromProfile(profile.name);
          if (
            decoded &&
            decoded.email.toLowerCase() === emailHint.toLowerCase()
          ) {
            saveUserLocal(decoded);
            return decoded;
          }
        }
      } catch {
        // ignore
      } finally {
        setIsSyncing(false);
      }
      return null;
    },
    [],
  );

  const login = useCallback(
    async (
      email: string,
      pin: string,
    ): Promise<{ success: boolean; error?: string }> => {
      // 1. Try localStorage first (fast path)
      let stored = loadStoredUser();

      // 2. If not in localStorage, try to recover from backend
      if (!stored) {
        const recovered = await recoverFromBackend(email);
        if (recovered) {
          stored = recovered;
        }
      }

      if (!stored) {
        return { success: false, error: "Usuário não encontrado" };
      }
      if (stored.email.toLowerCase() !== email.toLowerCase()) {
        return { success: false, error: "Email não corresponde" };
      }
      if (!verifyPin(pin, stored.pinHash)) {
        return { success: false, error: "PIN incorreto" };
      }

      setUser(stored);
      setIsAuthenticated(true);

      // Sync back to backend to keep data fresh
      setTimeout(() => syncToBackend(stored!), 500);

      return { success: true };
    },
    [recoverFromBackend, syncToBackend],
  );

  const register = useCallback(
    async (email: string, pin: string): Promise<AuthUser> => {
      const newUser: AuthUser = {
        userId: generateUserId(),
        email: email.toLowerCase().trim(),
        displayName: generateTraderName(),
        pinHash: hashPin(pin),
        registeredAt: Date.now(),
      };
      saveUserLocal(newUser);
      setUser(newUser);
      setIsAuthenticated(true);

      // Sync to backend immediately after registration
      setTimeout(() => syncToBackend(newUser), 500);

      return newUser;
    },
    [syncToBackend],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    // Keep user data in localStorage so email is remembered on next visit
  }, []);

  const updateDisplayName = useCallback(
    (name: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, displayName: name };
        saveUserLocal(updated);
        // Sync updated name to backend
        setTimeout(() => syncToBackend(updated), 300);
        return updated;
      });
    },
    [syncToBackend],
  );

  // When actor becomes available and user is authenticated, sync to backend
  useEffect(() => {
    if (isAuthenticated && user && actorRef.current) {
      syncToBackend(user);
    }
  }, [isAuthenticated, user, syncToBackend]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isSyncing,
        login,
        register,
        logout,
        updateDisplayName,
        setActor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
