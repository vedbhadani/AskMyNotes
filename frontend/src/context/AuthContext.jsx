import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:3001/api/auth';
const TOKEN_KEY = 'askmynotes_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const signUp = async ({ name, email, password }) => {
    try {
      const res = await axios.post(`${API_URL}/register`, { name, email, password });
      const { token, user: newUser } = res.data;
      localStorage.setItem(TOKEN_KEY, token);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      return { error: err.response?.data?.message || 'Registration failed.' };
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user: foundUser } = res.data;
      localStorage.setItem(TOKEN_KEY, token);
      setUser(foundUser);
      return { success: true };
    } catch (err) {
      return { error: err.response?.data?.message || 'Invalid email or password.' };
    }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
