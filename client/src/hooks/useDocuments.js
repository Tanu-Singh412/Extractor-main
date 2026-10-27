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

  const exportCSV = async (options = {}) => {
    const opts = typeof options === "string" ? { docType: options } : (options || {});
    const { docType, filterMode, expiryWindowDays, count } = opts;

    if (count === 0) {
      addToast("No records match the current filters to export.", "error");
      return;
    }

    const hasRecords = passports.length > 0;
    if (!hasRecords) {
      addToast("Database is empty.", "error");
      return;
    }

    try {
      await api.downloadExport("csv", opts);
      const typeLabel = docType === "PASSPORT" ? "Passport" : docType === "INSURANCE" ? "Insurance" : "Registry";
      const statusLabel = filterMode && filterMode !== "ALL"
        ? (filterMode === "EXPIRING_SOON" ? ` (Expiring in ${expiryWindowDays || 60}d)` : ` (${filterMode.replace("_", " ").toLowerCase()})`)
        : "";
      addToast(`${typeLabel}${statusLabel} exported to CSV successfully!`, "success");
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        onUnauthenticated();
        addToast("Session expired. Please sign in again.", "error");
      } else {
        addToast("Failed to export CSV.", "error");
      }
    }
  };

  const exportJSON = async (options = {}) => {
    const opts = typeof options === "string" ? { docType: options } : (options || {});
    const { docType, filterMode, expiryWindowDays, count } = opts;

    if (count === 0) {
      addToast("No records match the current filters to export.", "error");
      return;
    }

    const hasRecords = passports.length > 0;
    if (!hasRecords) {
      addToast("Database is empty.", "error");
      return;
    }

    try {
      await api.downloadExport("json", opts);
      const typeLabel = docType === "PASSPORT" ? "Passport" : docType === "INSURANCE" ? "Insurance" : "Registry";
      const statusLabel = filterMode && filterMode !== "ALL"
        ? (filterMode === "EXPIRING_SOON" ? ` (Expiring in ${expiryWindowDays || 60}d)` : ` (${filterMode.replace("_", " ").toLowerCase()})`)
        : "";
      addToast(`${typeLabel}${statusLabel} exported to JSON successfully!`, "success");
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        onUnauthenticated();
        addToast("Session expired. Please sign in again.", "error");
      } else {
        addToast("Failed to export JSON.", "error");
      }
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
