import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "los_olivos_users";
const SESSION_KEY = "los_olivos_session";
const SECURITY_ANSWER = "los olivos ibagué";

export interface UserRecord {
  nombre: string;
  usuario: string;
  pin: string; // simple 4-digit pin
  createdAt: string;
}

interface AuthContextType {
  user: UserRecord | null;
  loading: boolean;
  login: (usuario: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (nombre: string, usuario: string, pin: string, securityAnswer: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionJson) setUser(JSON.parse(sessionJson));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const getUsers = async (): Promise<UserRecord[]> => {
    const json = await AsyncStorage.getItem(USERS_KEY);
    return json ? JSON.parse(json) : [];
  };

  const login = async (usuario: string, pin: string) => {
    const users = await getUsers();
    const found = users.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase() && u.pin === pin
    );
    if (!found) throw new Error("Usuario o PIN incorrecto");
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(found));
    setUser(found);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const register = async (nombre: string, usuario: string, pin: string, securityAnswer: string) => {
    if (securityAnswer.trim().toLowerCase() !== SECURITY_ANSWER) {
      throw new Error("Respuesta de seguridad incorrecta");
    }
    if (pin.length < 4) throw new Error("El PIN debe tener al menos 4 dígitos");
    if (!nombre.trim() || !usuario.trim()) throw new Error("Nombre y usuario son obligatorios");

    const users = await getUsers();
    if (users.find((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      throw new Error("Ese nombre de usuario ya existe");
    }

    const newUser: UserRecord = {
      nombre: nombre.trim(),
      usuario: usuario.trim().toLowerCase(),
      pin,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
