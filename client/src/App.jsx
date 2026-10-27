import React, { useState, useMemo, useCallback } from "react";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import RegistryPage from "./pages/RegistryPage";
import Sidebar from "./components/common/Sidebar";
import TopHeader from "./components/common/TopHeader";
import ToastContainer from "./components/common/ToastContainer";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import { useDocuments } from "./hooks/useDocuments";

const getInitialRoute = () => {
  const path = window.location.pathname.toLowerCase();
  if (path === "/registry") return "REGISTRY";
  if (path === "/upload") return "UPLOAD";
  if (path === "/login") return "LOGIN";
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  if (hash === "registry") return "REGISTRY";
  if (hash === "upload") return "UPLOAD";
  if (hash === "login") return "LOGIN";
  return localStorage.getItem("app_active_route") || "UPLOAD";
};

export default function App() {
  const { toasts, addToast } = useToast();
  const { isAuthenticated, setIsAuthenticated, currentUser, loginUser, logoutUser } = useAuth();
  const handleUnauthenticated = useCallback(() => setIsAuthenticated(false), [setIsAuthenticated]);
  const { passports, loadPassports, deleteRecord, exportCSV, exportJSON } = useDocuments(
    isAuthenticated,
    handleUnauthenticated,
    addToast
  );

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);
  const [editingRecord, setEditingRecord] = useState(null);

  // Filter & Navigation states shared between Header, Sidebar & Registry
  const [filterMode, setFilterMode] = useState("ALL");
  const [registryDocType, setRegistryDocType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expiryWindowDays, setExpiryWindowDays] = useState(60);
  const [sidebarFilterMode] = useState("EXPIRING_SOON");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  // Navigate to route and synchronize URL + localStorage
  const navigateTo = (route, recordToEdit = null) => {
    if (recordToEdit) {
      setEditingRecord(recordToEdit);
    }
    setCurrentRoute(route);
    const targetPath = route === "LOGIN" ? "/login" : route === "REGISTRY" ? "/registry" : "/upload";
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ route }, "", targetPath);
    }
    localStorage.setItem("app_active_route", route);
  };

  // Synchronize browser Back / Forward buttons and URL hash
  React.useEffect(() => {
    const handleBrowserNav = () => {
      const path = window.location.pathname.toLowerCase();
      let matched = "UPLOAD";
      if (path === "/registry") matched = "REGISTRY";
      else if (path === "/upload") matched = "UPLOAD";
      else if (path === "/login") matched = "LOGIN";
      else {
        const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
        if (hash === "registry") matched = "REGISTRY";
        else if (hash === "upload") matched = "UPLOAD";
        else if (hash === "login") matched = "LOGIN";
      }
      setCurrentRoute(matched);
    };

    window.addEventListener("popstate", handleBrowserNav);
    window.addEventListener("hashchange", handleBrowserNav);
    return () => {
      window.removeEventListener("popstate", handleBrowserNav);
      window.removeEventListener("hashchange", handleBrowserNav);
    };
  }, []);

  // Sync initial URL with authentication status
  React.useEffect(() => {
    if (!isAuthenticated) {
      if (window.location.pathname !== "/login") {
        window.history.replaceState({ route: "LOGIN" }, "", "/login");
      }
    } else {
      if (window.location.pathname === "/login" || window.location.pathname === "/") {
        const targetPath = currentRoute === "REGISTRY" ? "/registry" : "/upload";
        window.history.replaceState({ route: currentRoute }, "", targetPath);
      }
    }
  }, [isAuthenticated, currentRoute]);

  // Document type counts
  const docTypeCounts = useMemo(() => {
    let passport = 0;
    let insurance = 0;
    passports.forEach((item) => {
      if ((item.docType || "PASSPORT") === "INSURANCE") insurance++;
      else passport++;
    });
    return {
      all: passports.length,
      passport,
      insurance
    };
  }, [passports]);

  // Scoped documents by active document type
  const scopedPassports = useMemo(() => {
    if (registryDocType === "ALL") return passports;
    return passports.filter(item => (item.docType || "PASSPORT") === registryDocType);
  }, [passports, registryDocType]);

  // Compute stats scoped to the active document type and active expiry window
  const activeStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDate = new Date(today);
    windowDate.setDate(today.getDate() + Number(expiryWindowDays));

    let valid = 0;
    let expSoon = 0;
    let exp = 0;

    scopedPassports.forEach((item) => {
      if (item.doe) {
        const d = new Date(item.doe);
        if (isNaN(d.getTime())) valid++;
        else if (d < today) exp++;
        else if (d <= windowDate) {
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
      totalCount: scopedPassports.length,
      validCount: valid,
      expiringSoonCount: expSoon,
      expiredCount: exp
    };
  }, [scopedPassports, expiryWindowDays]);

  const handleEditRecord = (record) => {
    navigateTo("UPLOAD", record);
    setMobileSidebarOpen(false);
  };

  const handleStatClick = (mode) => {
    if (currentRoute !== "REGISTRY") {
      navigateTo("REGISTRY");
    }
      setFilterMode(prev => (prev === mode ? "ALL" : mode));
    };

    const handleResetAllFilters = () => {
      setFilterMode("ALL");
      setRegistryDocType("ALL");
      setSearchQuery("");
      setExpiryWindowDays(60);
    };

  const handleLogin = (admin) => {
    loginUser(admin);
    const saved = localStorage.getItem("app_active_route");
    const nextRoute = saved && saved !== "LOGIN" ? saved : "UPLOAD";
    navigateTo(nextRoute);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigateTo("LOGIN");
    addToast("Logged out successfully.", "info");
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container dashboard-layout">
      <ToastContainer toasts={toasts} />

      <Sidebar
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        activeTab={currentRoute}
        setActiveTab={navigateTo}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        setIsSidebarOpen={setIsSidebarOpen}
        mobileSidebarOpen={mobileSidebarOpen}
        closeMobileSidebar={closeMobileSidebar}
        totalCount={activeStats.totalCount}
        validCount={activeStats.validCount}
        expiringSoonCount={activeStats.expiringSoonCount}
        expiredCount={activeStats.expiredCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="main-content">
        <TopHeader
          currentRoute={currentRoute}
          activeTab={currentRoute}
          openMobileSidebar={() => setMobileSidebarOpen(true)}
          filterMode={filterMode}
          handleStatClick={handleStatClick}
          totalCount={activeStats.totalCount}
          validCount={activeStats.validCount}
          expiringSoonCount={activeStats.expiringSoonCount}
          expiredCount={activeStats.expiredCount}
          registryDocType={registryDocType}
          expiryWindowDays={expiryWindowDays}
        />

        <div
          className="page-view-container"
          style={{ display: currentRoute === "UPLOAD" ? "block" : "none" }}
        >
          <UploadPage
            existingRecords={passports}
            editingRecord={editingRecord}
            onClearEdit={() => setEditingRecord(null)}
            onRecordSaved={loadPassports}
            addToast={addToast}
          />
        </div>

        <div
          className="page-view-container"
          style={{ display: currentRoute === "REGISTRY" ? "block" : "none" }}
        >
          <RegistryPage
            passports={passports}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            sidebarFilterMode={sidebarFilterMode}
            registryDocType={registryDocType}
            setRegistryDocType={setRegistryDocType}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            expiryWindowDays={expiryWindowDays}
            setExpiryWindowDays={setExpiryWindowDays}
            docTypeCounts={docTypeCounts}
            onResetAllFilters={handleResetAllFilters}
            onEditRecord={handleEditRecord}
            onDeleteRecord={deleteRecord}
            onExportCSV={exportCSV}
            onExportJSON={exportJSON}
          />
        </div>
      </div>
    </div>
  );
}
