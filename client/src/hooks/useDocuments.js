import { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "../services/api";

export function useDocuments(isAuthenticated, onUnauthenticated, addToast) {
  const [passports, setPassports] = useState([]);

  const loadPassports = useCallback(async () => {
    try {
      const data = await api.fetchPassports();
      setPassports(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        onUnauthenticated();
      } else {
        console.error("Failed to load passports:", err);
      }
    }
  }, [onUnauthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      // oxlint-disable-next-line react/set-state-in-effect
      loadPassports();
    }
  }, [isAuthenticated, loadPassports]);

  const deleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return false;
    try {
      await api.deletePassport(id);
      addToast("Record deleted.", "success");
      await loadPassports();
      return true;
    } catch (err) {
      console.error("Delete error:", err);
      addToast(err.message || "Error occurred while deleting.", "error");
      return false;
    }
  };

  const exportCSV = async () => {
    if (!passports.length) {
      addToast("Database is empty.", "error");
      return;
    }
    try {
      await api.downloadExport("csv");
      addToast("CSV exported successfully!", "success");
    } catch {
      addToast("Failed to export CSV.", "error");
    }
  };

  const exportJSON = async () => {
    if (!passports.length) {
      addToast("Database is empty.", "error");
      return;
    }
    try {
      await api.downloadExport("json");
      addToast("JSON exported successfully!", "success");
    } catch {
      addToast("Failed to export JSON.", "error");
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsFromNow = new Date(today);
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    let expSoon = 0;
    let valid = 0;
    let exp = 0;

    passports.forEach((item) => {
      if (item.doe) {
        const expiryDate = new Date(item.doe);
        if (isNaN(expiryDate.getTime())) valid++;
        else if (expiryDate < today) exp++;
        else if (expiryDate <= sixMonthsFromNow) {
          expSoon++;
          valid++;
        } else {
          valid++;
        }
      } else {
        valid++;
      }
    });

    return {
      totalCount: passports.length,
      validCount: valid,
      expiringSoonCount: expSoon,
      expiredCount: exp
    };
  }, [passports]);

  return {
    passports,
    loadPassports,
    deleteRecord,
    exportCSV,
    exportJSON,
    stats
  };
}
