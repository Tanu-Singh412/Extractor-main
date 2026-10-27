const registry = require('./registry.repository');

module.exports = {
    initDB: registry.initDB,
    getPassports: async () => registry.listRecords(),
    addPassport: async (record) => registry.createRecord(record),
    updatePassport: async (id, fields) => registry.updateRecord(id, fields),
    deletePassport: async (id) => registry.deleteRecord(id),
    isUsingMongo: registry.isUsingMongo
};

