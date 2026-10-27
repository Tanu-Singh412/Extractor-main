const { listRecords } = require('../repositories/registry.repository');
const { exportCsv, exportJson } = require('../services/registry-export.service');

function downloadCsv(req, res) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registry_export.csv"');
    res.send(exportCsv(listRecords()));
}

function downloadJson(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registry_export.json"');
    res.send(exportJson(listRecords()));
}

module.exports = { downloadCsv, downloadJson };
