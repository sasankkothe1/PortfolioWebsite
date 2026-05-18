import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    client.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await client.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
