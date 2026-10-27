const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5058/api";

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

export async function downloadExport(format) {
  const res = await fetch(`${API_BASE}/export/${format}`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Export to ${format.toUpperCase()} failed.`);
  const blob = await res.blob();
  const filename = `registry_export.${format}`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
