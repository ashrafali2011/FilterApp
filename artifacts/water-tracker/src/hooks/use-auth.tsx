import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface User {
  id: number;
  username: string;
  createdAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isGuest: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  setAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("aquatrack_token");
    const savedUser = localStorage.getItem("aquatrack_user");
    const guestState = localStorage.getItem("aquatrack_guest");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {}
    } else if (guestState === "true") {
      setIsGuest(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = (newUser: User, newToken: string) => {
    localStorage.setItem("aquatrack_token", newToken);
    localStorage.setItem("aquatrack_user", JSON.stringify(newUser));
    localStorage.removeItem("aquatrack_guest");
    setToken(newToken);
    setUser(newUser);
    setIsGuest(false);
  };

  const setAsGuest = () => {
    localStorage.setItem("aquatrack_guest", "true");
    setIsGuest(true);
  };

  const logout = () => {
    localStorage.removeItem("aquatrack_token");
    localStorage.removeItem("aquatrack_user");
    localStorage.removeItem("aquatrack_guest");
    setToken(null);
    setUser(null);
    setIsGuest(false);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        isGuest,
        token,
        login,
        setAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
