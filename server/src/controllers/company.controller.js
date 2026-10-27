const companyRepo = require('../repositories/company.repository');

async function getCompanies(req, res) {
    try {
        const companies = companyRepo.listCompanies();
        res.json({ success: true, companies });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function addCompany(req, res) {
    try {
        const { name } = req.body;
        const company = await companyRepo.createCompany(name);
        res.status(201).json({ success: true, company });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

async function removeCompany(req, res) {
    try {
        const { id } = req.params;
        const deleted = await companyRepo.deleteCompany(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, message: 'Company removed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function editCompany(req, res) {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const updated = await companyRepo.updateCompany(id, name);
        res.json({ success: true, company: updated });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

module.exports = {
    getCompanies,
    addCompany,
    editCompany,
    removeCompany
};
