import { useState, useEffect } from "react";
import * as api from "../services/api";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    api.getMe()
      .then(data => {
        if (data.success && data.admin) {
          setIsAuthenticated(true);
          setCurrentUser(data.admin);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          localStorage.removeItem("isAuthenticated");
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem("isAuthenticated");
      });
  }, []);

  const loginUser = (admin) => {
    setIsAuthenticated(true);
    setCurrentUser(admin);
  };

  const logoutUser = async () => {
    try {
      await api.logout();
    } catch {}
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("isAuthenticated");
  };

  return {
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    loginUser,
    logoutUser
  };
}
