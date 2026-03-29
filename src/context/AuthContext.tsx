import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { AppUser, AppUserPermissions } from '@/types/database';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  appUser: AppUser | null;
  /** True if the current user is owner or admin */
  isAdmin: boolean;
  /** Check whether the current user has access to a specific section */
  hasPermission: (key: keyof AppUserPermissions) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  appUser: null,
  isAdmin: false,
  hasPermission: () => true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the app_users row for this auth user
  const loadAppUser = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (!error && data) {
        setAppUser(data as AppUser);
      } else {
        // No app_users row yet — treat as owner (for backwards compatibility / first-time setup)
        setAppUser(null);
      }
    } catch {
      setAppUser(null);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAppUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadAppUser(session.user.id);
        } else {
          setAppUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Derived helpers
  const isAdmin = !appUser || appUser.role === 'owner' || appUser.role === 'admin';

  const hasPermission = (key: keyof AppUserPermissions): boolean => {
    // No app_users row yet → full access (backwards compat)
    if (!appUser) return true;
    // Owner/admin always have full access
    if (appUser.role === 'owner' || appUser.role === 'admin') return true;
    // Staff — check permissions map
    return appUser.permissions?.[key] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, appUser, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
