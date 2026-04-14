import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, role: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedUser = api.getStoredUser();
                if (storedUser) {
                    const validUser = await api.verifyToken();
                    if (validUser) {
                        setUser(validUser);
                    }
                }
            } catch {
                api.logout();
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (username: string, password: string) => {
        const user = await api.loginUser(username, password);
        setUser(user);
    };

    const register = async (username: string, password: string, role: string) => {
        const user = await api.registerUser(username, password, role);
        setUser(user);
    };

    const logout = () => {
        api.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}