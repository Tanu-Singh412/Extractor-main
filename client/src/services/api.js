const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Invalid username or password.");
  }
  return data;
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  return res.json().catch(() => ({}));
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to change password.");
  }
  return data;
}


export async function getMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("Unauthenticated");
  return res.json();
}

export async function fetchPassports() {
  const res = await fetch(`${API_BASE}/passports`, {
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createPassport(record) {
  const res = await fetch(`${API_BASE}/passports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to create record.");
  return data;
}

export async function updatePassport(id, record) {
  const res = await fetch(`${API_BASE}/passports/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update record.");
  return data;
}

export async function deletePassport(id) {
  const res = await fetch(`${API_BASE}/passports/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Failed to delete record.");
  return res.json().catch(() => ({}));
}

export async function scanSingle(file, docType) {
  const formData = new FormData();
  formData.append("docType", docType);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Scan failed.");
  return data;
}

export async function scanMulti(files, docType) {
  const formData = new FormData();
  formData.append("docType", docType);
  files.forEach(f => formData.append("files", f));
  const res = await fetch(`${API_BASE}/scan-multi`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Batch scan failed.");
  return data;
}

export async function scanMerge(files, docType) {
  const formData = new FormData();
  formData.append("docType", docType);
  files.forEach(f => formData.append("files", f));
  const res = await fetch(`${API_BASE}/scan-merge`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Merged scan failed.");
  return data;
}

export async function downloadExport(format, options = {}) {
  const params = new URLSearchParams();
  const opts = typeof options === "string" ? { docType: options } : (options || {});

  if (opts.docType && opts.docType !== "ALL") {
    params.set("docType", opts.docType);
  }
  if (opts.filterMode && opts.filterMode !== "ALL") {
    params.set("filterMode", opts.filterMode);
  }
  if (opts.expiryWindowDays) {
    params.set("expiryWindowDays", opts.expiryWindowDays);
  }
  if (opts.searchQuery && opts.searchQuery.trim()) {
    params.set("searchQuery", opts.searchQuery.trim());
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/export/${format}${queryString}`, {
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Export to ${format.toUpperCase()} failed.`);

  let filename = "";
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) filename = match[1];
  }
  if (!filename) {
    const base = opts.docType && opts.docType !== "ALL" ? opts.docType.toLowerCase() : "registry";
    const statusPart = opts.filterMode && opts.filterMode !== "ALL"
      ? (opts.filterMode === "EXPIRING_SOON" ? `_expiring_${opts.expiryWindowDays || 60}d` : `_${opts.filterMode.toLowerCase()}`)
      : "";
    filename = `${base}${statusPart}_export.${format}`;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchCompanies() {
  const res = await fetch(`${API_BASE}/companies`, {
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.companies || [];
}

export async function createCompany(name) {
  const res = await fetch(`${API_BASE}/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create company");
  return data.company;
}

export async function updateCompany(id, name) {
  const res = await fetch(`${API_BASE}/companies/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update company");
  return data.company;
}

export async function deleteCompany(id) {
  const res = await fetch(`${API_BASE}/companies/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete company");
  return true;
}


