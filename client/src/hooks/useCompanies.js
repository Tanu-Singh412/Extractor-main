import { useState, useEffect, useCallback } from "react";
import * as api from "../services/api";

export function useCompanies(isAuthenticated, addToast) {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCompanies = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const list = await api.fetchCompanies();
      setCompanies(list);
    } catch (err) {
      console.warn("Failed to load companies:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const addCompany = useCallback(async (name) => {
    try {
      const created = await api.createCompany(name);
      setCompanies(prev => {
        if (prev.some(c => c.id === created.id || c.name.toLowerCase() === created.name.toLowerCase())) {
          return prev;
        }
        return [...prev, created];
      });
      if (addToast) addToast(`Company "${created.name}" created`, "success");
      return created;
    } catch (err) {
      if (addToast) addToast(err.message || "Failed to add company", "error");
      throw err;
    }
  }, [addToast]);

  const editCompany = useCallback(async (id, newName) => {
    try {
      const updated = await api.updateCompany(id, newName);
      setCompanies(prev => prev.map(c => (c.id === id || c.name === id ? { ...c, name: updated.name } : c)));
      if (addToast) addToast(`Company renamed to "${updated.name}"`, "success");
      return updated;
    } catch (err) {
      if (addToast) addToast(err.message || "Failed to update company", "error");
      throw err;
    }
  }, [addToast]);

  const removeCompany = useCallback(async (id) => {
    try {
      await api.deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id && c.name !== id));
      if (addToast) addToast("Company removed", "info");
      return true;
    } catch (err) {
      if (addToast) addToast(err.message || "Failed to remove company", "error");
      throw err;
    }
  }, [addToast]);

  return {
    companies,
    isLoading,
    loadCompanies,
    addCompany,
    editCompany,
    removeCompany
  };
}
