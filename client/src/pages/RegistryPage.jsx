import React, { useState, useMemo } from "react";
import RegistryToolbar from "../components/registry/RegistryToolbar";
import RegistryTable from "../components/registry/RegistryTable";
import RecordDetailModal from "../components/registry/RecordDetailModal";
import SideDrawer from "../components/registry/SideDrawer";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";

const ITEMS_PER_PAGE = 10;

export default function RegistryPage({
  passports = [],
  filterMode = "ALL",
  setFilterMode,
  isSidebarOpen,
  setIsSidebarOpen,
  sidebarFilterMode = "EXPIRING_SOON",
  registryDocType = "ALL",
  setRegistryDocType,
  searchQuery = "",
  setSearchQuery,
  expiryWindowDays = 60,
  setExpiryWindowDays,
  docTypeCounts = { all: 0, passport: 0, insurance: 0 },
  onResetAllFilters,
  onEditRecord,
  onDeleteRecord,
  onExportCSV,
  onExportJSON
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModalRecord, setActiveModalRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [prevFilters, setPrevFilters] = useState({ searchQuery, filterMode, registryDocType, expiryWindowDays });
  if (
    prevFilters.searchQuery !== searchQuery ||
    prevFilters.filterMode !== filterMode ||
    prevFilters.registryDocType !== registryDocType ||
    prevFilters.expiryWindowDays !== expiryWindowDays
  ) {
    setPrevFilters({ searchQuery, filterMode, registryDocType, expiryWindowDays });
    setCurrentPage(1);
  }

  const filteredPassports = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDate = new Date(today);
    windowDate.setDate(today.getDate() + Number(expiryWindowDays));

    return passports.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const firstName = item.firstName || item.givenNames || "";
      const lastName = item.lastName || item.surname || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();

      const matchesSearch =
        !query ||
        (item.passportNo && item.passportNo.toLowerCase().includes(query)) ||
        (item.policyNo && item.policyNo.toLowerCase().includes(query)) ||
        (item.lastName && item.lastName.toLowerCase().includes(query)) ||
        (item.surname && item.surname.toLowerCase().includes(query)) ||
        (item.firstName && item.firstName.toLowerCase().includes(query)) ||
        (item.givenNames && item.givenNames.toLowerCase().includes(query)) ||
        (item.memberName && item.memberName.toLowerCase().includes(query)) ||
        fullName.includes(query) ||
        (item.nationality && item.nationality.toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (registryDocType !== "ALL" && (item.docType || "PASSPORT") !== registryDocType) return false;
      if (filterMode === "ALL") return true;

      const expiryDate = item.doe ? new Date(item.doe) : null;
      const isDateValid = expiryDate && !isNaN(expiryDate.getTime());
      if (filterMode === "EXPIRED") return isDateValid && expiryDate < today;
      if (filterMode === "EXPIRING_SOON") return isDateValid && expiryDate >= today && expiryDate <= windowDate;
      if (filterMode === "VALID") return !isDateValid || expiryDate >= today;
      return true;
    });
  }, [passports, searchQuery, filterMode, registryDocType, expiryWindowDays]);

  const sidebarPassports = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDate = new Date(today);
    windowDate.setDate(today.getDate() + Number(expiryWindowDays));

    return passports.filter((item) => {
      if (sidebarFilterMode === "ALL") return true;
      const expiryDate = item.doe ? new Date(item.doe) : null;
      const isDateValid = expiryDate && !isNaN(expiryDate.getTime());
      if (sidebarFilterMode === "EXPIRED") return isDateValid && expiryDate < today;
      if (sidebarFilterMode === "EXPIRING_SOON") return isDateValid && expiryDate >= today && expiryDate <= windowDate;
      if (sidebarFilterMode === "VALID") return !isDateValid || expiryDate >= today;
      return true;
    });
  }, [passports, sidebarFilterMode, expiryWindowDays]);

  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / ITEMS_PER_PAGE));
  const paginatedPassports = useMemo(() => {
    return filteredPassports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredPassports, currentPage]);

  const handleRequestDelete = (target) => {
    if (!target) return;
    const record = typeof target === "object" ? target : passports.find((p) => p.id === target) || { id: target };
    setRecordToDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const success = await onDeleteRecord(recordToDelete.id);
      if (success) {
        if (activeModalRecord?.id === recordToDelete.id) {
          setActiveModalRecord(null);
        }
        setRecordToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setRecordToDelete(null);
    }
  };

  const handleEdit = (record) => {
    if (activeModalRecord) {
      setActiveModalRecord(null);
    }
    if (onEditRecord) {
      onEditRecord(record);
    }
  };

  const getExportLabel = (format) => {
    let typeText = "Records";
    if (registryDocType === "PASSPORT") typeText = "Passports";
    else if (registryDocType === "INSURANCE") typeText = "Insurance";

    let statusText = "";
    if (filterMode === "EXPIRED") statusText = "Expired ";
    else if (filterMode === "EXPIRING_SOON") statusText = `Expiring (${expiryWindowDays}d) `;
    else if (filterMode === "VALID") statusText = "Valid ";

    return `Export ${statusText}${typeText} (${format.toUpperCase()})`;
  };

  const getExportTitle = (format) => {
    const typeText = registryDocType === "ALL" ? "all" : registryDocType.toLowerCase();
    const statusText = filterMode === "ALL" ? "" : ` (${filterMode.replace("_", " ").toLowerCase()})`;
    return `Export ${typeText}${statusText} records as ${format.toUpperCase()} (${filteredPassports.length} items)`;
  };

  const handleExport = (format) => {
    const options = {
      docType: registryDocType,
      filterMode,
      expiryWindowDays,
      searchQuery,
      count: filteredPassports.length
    };
    if (format === "csv" && onExportCSV) {
      onExportCSV(options);
    } else if (format === "json" && onExportJSON) {
      onExportJSON(options);
    }
  };

  return (
    <main>
      <div className="database-section">
        <div className="registry-section-header">
          <div>
            <h2 className="panel-title">
              All records
            </h2>
            <p className="panel-subtitle">
              {registryDocType === "PASSPORT"
                ? `Showing ${filteredPassports.length} of ${docTypeCounts.passport} passports`
                : registryDocType === "INSURANCE"
                ? `Showing ${filteredPassports.length} of ${docTypeCounts.insurance} insurance policies`
                : `Showing ${filteredPassports.length} of ${passports.length} records`}
              {filterMode !== "ALL" && (
                filterMode === "EXPIRING_SOON"
                  ? ` · Expiring in ${expiryWindowDays} days`
                  : ` · ${filterMode.replace("_", " ")}`
              )}
            </p>
          </div>
          <div className="db-actions">
            <button
              type="button"
              className="btn-action"
              onClick={() => handleExport("csv")}
              title={getExportTitle("CSV")}
            >
              <i className="fa-solid fa-file-csv"></i> {getExportLabel("CSV")}
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={() => handleExport("json")}
              title={getExportTitle("JSON")}
            >
              <i className="fa-solid fa-file-code"></i> {getExportLabel("JSON")}
            </button>
          </div>
        </div>

        <RegistryToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          registryDocType={registryDocType}
          setRegistryDocType={setRegistryDocType}
          docTypeCounts={docTypeCounts}
          filterMode={filterMode}
          onClearFilterMode={() => setFilterMode && setFilterMode("ALL")}
          onResetAllFilters={onResetAllFilters}
          expiryWindowDays={expiryWindowDays}
          setExpiryWindowDays={setExpiryWindowDays}
          onActivateExpiringSoon={() => setFilterMode && setFilterMode("EXPIRING_SOON")}
        />

        <RegistryTable
          passports={paginatedPassports}
          registryDocType={registryDocType}
          onViewRecord={setActiveModalRecord}
          onEditRecord={handleEdit}
          onDeleteRecord={handleRequestDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onResetFilters={onResetAllFilters}
        />
      </div>

      {activeModalRecord && (
        <RecordDetailModal
          record={activeModalRecord}
          onClose={() => setActiveModalRecord(null)}
          onEdit={handleEdit}
          onDelete={handleRequestDelete}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(recordToDelete)}
        record={recordToDelete}
        isDeleting={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <SideDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filterMode={sidebarFilterMode}
        passports={sidebarPassports}
        onSelectRecord={(rec) => setActiveModalRecord(rec)}
      />
    </main>
  );
}
