import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Register function
  async function register({ firstName, lastName, email, password }) {
    const res = await api.post("/api/auth/register", {
      fullName: { firstName, lastName },
      email,
      password,
    });
    setUser(res.data.user);
    localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token); // ← add
    return res.data;
  }

  // Login function
  async function login({ email, password }) {
    const res = await api.post("/api/auth/login", { email, password });
    setUser(res.data.user);
    localStorage.setItem("user", JSON.stringify(res.data.user));
     localStorage.setItem("token", res.data.token); // ← add
    return res.data;
  }


  function logout() {
    setUser(null);
    localStorage.removeItem("user");
      localStorage.removeItem("token"); // ← add
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}