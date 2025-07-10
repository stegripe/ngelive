import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // Ubah default ke undefined (loading state)

  // Check token in localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/me", {
        headers: { Authorization: "Bearer " + token }
      })
        .then((r) => r.json())
        .then((d) => setUser(d.user))
        .catch(() => setUser(null));
    } else {
      setUser(null); // <-- penting: pastikan setUser(null) kalau token tidak ada!
    }
  }, []);

  const login = async (username, password) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      setUser(data.user);
      return true;
    }
    throw new Error(data.error || "Login failed");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
