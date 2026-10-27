const { listRecords } = require('../repositories/registry.repository');
const { exportCsv, exportJson } = require('../services/registry-export.service');

function getFilteredRecords(req) {
    let records = listRecords();

    // 1. Filter by docType (ALL, PASSPORT, INSURANCE)
    const rawType = req.query.docType || req.query.type;
    const docType = (rawType && rawType.toUpperCase() !== 'ALL') ? rawType.toUpperCase().trim() : 'ALL';
    if (docType !== 'ALL') {
        records = records.filter(r => (r.docType || 'PASSPORT').toUpperCase() === docType);
    }

    // 2. Filter by status / filterMode (ALL, VALID, EXPIRING_SOON, EXPIRED)
    const rawFilterMode = req.query.filterMode || req.query.status;
    const filterMode = rawFilterMode ? rawFilterMode.toUpperCase().trim() : 'ALL';
    const rawDays = req.query.expiryWindowDays || req.query.days;
    const expiryWindowDays = Number(rawDays) > 0 ? Number(rawDays) : 60;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDate = new Date(today);
    windowDate.setDate(today.getDate() + expiryWindowDays);

    if (filterMode !== 'ALL') {
        records = records.filter(item => {
            const expiryDate = item.doe ? new Date(item.doe) : null;
            const isDateValid = expiryDate && !isNaN(expiryDate.getTime());
            if (filterMode === 'EXPIRED') return isDateValid && expiryDate < today;
            if (filterMode === 'EXPIRING_SOON') return isDateValid && expiryDate >= today && expiryDate <= windowDate;
            if (filterMode === 'VALID') return !isDateValid || expiryDate >= today;
            return true;
        });
    }

    // 3. Filter by search query
    const rawSearch = req.query.searchQuery || req.query.search || req.query.q;
    if (rawSearch && rawSearch.trim()) {
        const query = rawSearch.toLowerCase().trim();
        records = records.filter(item => {
            const firstName = item.firstName || item.givenNames || '';
            const lastName = item.lastName || item.surname || '';
            const fullName = `${firstName} ${lastName}`.toLowerCase();

            return (
                (item.passportNo && item.passportNo.toLowerCase().includes(query)) ||
                (item.policyNo && item.policyNo.toLowerCase().includes(query)) ||
                (item.lastName && item.lastName.toLowerCase().includes(query)) ||
                (item.surname && item.surname.toLowerCase().includes(query)) ||
                (item.firstName && item.firstName.toLowerCase().includes(query)) ||
                (item.givenNames && item.givenNames.toLowerCase().includes(query)) ||
                (item.memberName && item.memberName.toLowerCase().includes(query)) ||
                fullName.includes(query) ||
                (item.nationality && item.nationality.toLowerCase().includes(query))
            );
        });
    }

    return { records, docType, filterMode, expiryWindowDays };
}

function getExportFilename(docType, filterMode, expiryWindowDays, ext) {
    const parts = [];
    if (docType && docType !== 'ALL') {
        parts.push(docType.toLowerCase());
    } else {
        parts.push('registry');
    }

    if (filterMode && filterMode !== 'ALL') {
        if (filterMode === 'EXPIRING_SOON') {
            parts.push(`expiring_${expiryWindowDays}d`);
        } else {
            parts.push(filterMode.toLowerCase());
        }
    }

    parts.push('export');
    return `${parts.join('_')}.${ext}`;
}

function downloadCsv(req, res) {
    const { records, docType, filterMode, expiryWindowDays } = getFilteredRecords(req);
    const filename = getExportFilename(docType, filterMode, expiryWindowDays, 'csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportCsv(records, docType));
}

function downloadJson(req, res) {
    const { records, docType, filterMode, expiryWindowDays } = getFilteredRecords(req);
    const filename = getExportFilename(docType, filterMode, expiryWindowDays, 'json');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportJson(records));
}

module.exports = { downloadCsv, downloadJson };

