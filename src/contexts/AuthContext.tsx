import React, { createContext, useContext, useEffect, useState } from 'react';
import { RecordModel } from 'pocketbase';
import { pb, Role } from '../services/pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  role: Role | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record as RecordModel | null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record as RecordModel | null);
    }, true);

    (async () => {
      // The locally cached auth record can be stale (e.g. an admin changed
      // this user's role since their last login) - refresh it on load.
      if (pb.authStore.isValid) {
        try {
          await pb.collection('users').authRefresh();
        } catch (e) {
          console.error('Error refreshing auth session', e);
          pb.authStore.clear();
        }
      }
      setLoading(false);
    })();

    return unsubscribe;
  }, []);

  const role = (user?.role as Role) ?? null;

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
