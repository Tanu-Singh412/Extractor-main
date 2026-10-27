const registry = require('../repositories/registry.repository');

function validateRecordPayload(body, currentId = null) {
    const errors = [];
    if (!body || typeof body !== 'object') {
        return { valid: false, errors: ['Invalid request payload'] };
    }

    const docType = (body.docType || 'PASSPORT').toUpperCase();
    if (!['PASSPORT', 'INSURANCE'].includes(docType)) {
        errors.push('docType must be either PASSPORT or INSURANCE');
    }

    if (body.passportNo) {
        const pno = String(body.passportNo).trim();
        if (!/^[A-Z0-9]{5,15}$/i.test(pno)) {
            errors.push('Passport Number must be alphanumeric (5–15 characters)');
        }
    }

    if (body.policyNo) {
        const pno = String(body.policyNo).trim();
        if (pno.length < 3 || pno.length > 50) {
            errors.push('Policy Number must be between 3 and 50 characters');
        }
    }

    if (body.email) {
        const email = String(body.email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email address format');
        }
    }

    if (body.phone) {
        const phone = String(body.phone).trim().replace(/\D/g, '');
        if (phone.length > 0 && (phone.length < 7 || phone.length > 15)) {
            errors.push('Phone number must have between 7 and 15 digits');
        }
    }

    if (body.dob) {
        const d = new Date(body.dob);
        if (isNaN(d.getTime())) {
            errors.push('Date of Birth is not a valid date');
        }
    }

    if (body.doe) {
        const d = new Date(body.doe);
        if (isNaN(d.getTime())) {
            errors.push('Date of Expiry is not a valid date');
        }
    }

    if (body.issueDate && body.doe) {
        const issue = new Date(body.issueDate);
        const doe = new Date(body.doe);
        if (!isNaN(issue.getTime()) && !isNaN(doe.getTime()) && doe <= issue) {
            errors.push('Date of Expiry must be after Date of Issue');
        }
    }

    if (body.effectiveDate && body.doe) {
        const eff = new Date(body.effectiveDate);
        const doe = new Date(body.doe);
        if (!isNaN(eff.getTime()) && !isNaN(doe.getTime()) && doe < eff) {
            errors.push('Date of Expiry cannot be before Effective Date');
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    const duplicate = registry.findDuplicateIdentifier(body, currentId);
    if (duplicate) {
        return {
            valid: false,
            isDuplicate: true,
            field: duplicate.field,
            message: duplicate.message,
            errors: [duplicate.message]
        };
    }

    return { valid: true, errors: [] };
}

function listRecords(req, res) {
    res.json(registry.listRecords());
}

function createRecord(req, res) {
    const result = validateRecordPayload(req.body);
    if (!result.valid) {
        const status = result.isDuplicate ? 409 : 400;
        return res.status(status).json({
            success: false,
            message: result.message || result.errors[0],
            field: result.field,
            errors: result.errors
        });
    }
    try {
        const record = registry.createRecord(req.body);
        res.json({ success: true, record });
    } catch (err) {
        const status = err.statusCode || 400;
        return res.status(status).json({
            success: false,
            message: err.message,
            field: err.field,
            errors: [err.message]
        });
    }
}

function updateRecord(req, res) {
    const result = validateRecordPayload(req.body, req.params.id);
    if (!result.valid) {
        const status = result.isDuplicate ? 409 : 400;
        return res.status(status).json({
            success: false,
            message: result.message || result.errors[0],
            field: result.field,
            errors: result.errors
        });
    }
    try {
        const record = registry.updateRecord(req.params.id, req.body);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true, record });
    } catch (err) {
        const status = err.statusCode || 400;
        return res.status(status).json({
            success: false,
            message: err.message,
            field: err.field,
            errors: [err.message]
        });
    }
}

function deleteRecord(req, res) {
    if (!registry.deleteRecord(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true });
}

module.exports = { listRecords, createRecord, updateRecord, deleteRecord };
