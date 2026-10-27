const mongoose = require('mongoose');
const { encrypt, decrypt, hashSearchIndex } = require('../services/encryption.service');

const MRZSchema = new mongoose.Schema({
  hasMrz: { type: Boolean, default: false },
  raw: { type: String, default: '', set: encrypt, get: decrypt },
  line1: { type: String, default: '', set: encrypt, get: decrypt },
  line2: { type: String, default: '', set: encrypt, get: decrypt },
  line3: { type: String, default: '', set: encrypt, get: decrypt },
  type: { type: String, default: 'TD3' }, // TD1, TD2, TD3
  checkDigits: {
    passportNo: { type: String, default: '' },
    dob: { type: String, default: '' },
    doe: { type: String, default: '' },
    composite: { type: String, default: '' }
  },
  valid: { type: Boolean, default: false }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const ExtractionMetadataSchema = new mongoose.Schema({
  rawText: { type: String, default: '' },
  sourceFileName: { type: String, default: '' },
  extractionEngine: { type: String, default: 'tesseract' },
  confidenceScore: { type: Number, default: 0 },
  extractedAt: { type: Date, default: Date.now }
}, { _id: false });

const PassportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  },
  docType: {
    type: String,
    required: true,
    default: 'PASSPORT',
    uppercase: true,
    enum: ['PASSPORT']
  },

  // Document Identifiers (Encrypted at rest with blind search index hash)
  passportNo: {
    type: String,
    required: true,
    trim: true,
    set: encrypt,
    get: decrypt,
    unique: true
  },
  passportNoHash: {
    type: String,
    index: true
  },
  issuingCountry: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  nationality: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },

  // Primary Personal Information
  surname: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  givenNames: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  sex: {
    type: String,
    trim: true,
    uppercase: true,
    enum: ['M', 'F', 'X', 'O', ''],
    default: ''
  },

  // Dates (Stored as ISO Strings YYYY-MM-DD for lossless OCR alignment)
  dob: {
    type: String,
    trim: true,
    default: ''
  },
  doe: {
    type: String,
    trim: true,
    index: true,
    default: ''
  },
  issueDate: {
    type: String,
    trim: true,
    default: ''
  },

  // Geographic Information
  placeOfBirth: {
    type: String,
    trim: true,
    default: ''
  },
  placeOfIssue: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },

  // Sensitive Contact Information (Encrypted at rest)
  phone: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    set: encrypt,
    get: decrypt
  },

  // Sensitive Family and Relationships (Encrypted at rest)
  fatherName: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },
  motherName: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },
  spouseName: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },

  // Government & Tracking Numbers (Encrypted at rest)
  fileNo: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },
  oldPassportNo: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },

  // Optical Machine Readable Zone (MRZ)
  mrz: {
    type: MRZSchema,
    default: () => ({})
  },

  // Extraction metadata
  extraction: {
    type: ExtractionMetadataSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Automatic search hash synchronization
PassportSchema.pre('save', function (next) {
  if (this.passportNo) {
    this.passportNoHash = hashSearchIndex(decrypt(this.passportNo));
  }
  next();
});

// Compound Index for fast lookup & search
PassportSchema.index({ passportNoHash: 1, issuingCountry: 1 });
PassportSchema.index({ lastName: 'text', firstName: 'text' });

// Virtuals
PassportSchema.virtual('fullName').get(function () {
  const first = this.firstName || this.givenNames || '';
  const last = this.lastName || this.surname || '';
  return `${first} ${last}`.trim();
});

PassportSchema.virtual('isValid').get(function () {
  if (!this.doe) return true;
  const expiry = new Date(this.doe);
  if (isNaN(expiry.getTime())) return true;
  return expiry >= new Date();
});

PassportSchema.virtual('isExpiringSoon').get(function () {
  if (!this.doe) return false;
  const expiry = new Date(this.doe);
  if (isNaN(expiry.getTime())) return false;
  const today = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(today.getMonth() + 6);
  return expiry >= today && expiry <= sixMonths;
});

// Static Methods
PassportSchema.statics.fromOcr = function (ocrData, rawText = '', sourceFileName = '') {
  const fName = ocrData.firstName || ocrData.givenNames || '';
  const lName = ocrData.lastName || ocrData.surname || '';
  const rawPassportNo = (ocrData.passportNo || '').trim().toUpperCase();

  return new this({
    id: ocrData.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    docType: 'PASSPORT',
    passportNo: rawPassportNo,
    passportNoHash: hashSearchIndex(rawPassportNo),
    issuingCountry: ocrData.issuingCountry || '',
    nationality: ocrData.nationality || '',
    surname: lName,
    lastName: lName,
    givenNames: fName,
    firstName: fName,
    sex: ocrData.sex || '',
    dob: ocrData.dob || '',
    doe: ocrData.doe || '',
    issueDate: ocrData.issueDate || '',
    placeOfBirth: ocrData.placeOfBirth || '',
    placeOfIssue: ocrData.placeOfIssue || '',
    address: ocrData.address || '',
    phone: ocrData.phone || '',
    email: ocrData.email || '',
    fatherName: ocrData.fatherName || '',
    motherName: ocrData.motherName || '',
    spouseName: ocrData.spouseName || '',
    fileNo: ocrData.fileNo || '',
    oldPassportNo: ocrData.oldPassportNo || '',
    mrz: {
      hasMrz: Boolean(ocrData.mrzLine1 || ocrData.mrz),
      line1: ocrData.mrzLine1 || '',
      line2: ocrData.mrzLine2 || '',
      valid: Boolean(ocrData.mrzValid)
    },
    extraction: {
      rawText: rawText || ocrData.rawText || '',
      sourceFileName: sourceFileName || ocrData.fileName || '',
      extractedAt: new Date()
    }
  });
};

PassportSchema.statics.findByPassportNo = function (passportNo) {
  if (!passportNo) return null;
  const hash = hashSearchIndex(passportNo);
  return this.findOne({ passportNoHash: hash });
};

PassportSchema.statics.findExpiringSoon = function (months = 6) {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + months);
  const maxDate = targetDate.toISOString().split('T')[0];

  return this.find({
    doe: { $gte: today, $lte: maxDate }
  }).sort({ doe: 1 });
};

// Instance Methods
PassportSchema.methods.toRegistryFormat = function () {
  const obj = this.toObject();
  return {
    id: obj.id,
    docType: 'PASSPORT',
    passportNo: decrypt(obj.passportNo),
    lastName: obj.lastName || obj.surname || '',
    firstName: obj.firstName || obj.givenNames || '',
    surname: obj.surname || obj.lastName || '',
    givenNames: obj.givenNames || obj.firstName || '',
    nationality: obj.nationality,
    sex: obj.sex,
    dob: obj.dob,
    doe: obj.doe,
    issueDate: obj.issueDate,
    issuingCountry: obj.issuingCountry,
    placeOfBirth: obj.placeOfBirth,
    placeOfIssue: obj.placeOfIssue,
    address: decrypt(obj.address),
    phone: decrypt(obj.phone),
    email: decrypt(obj.email),
    fatherName: decrypt(obj.fatherName),
    motherName: decrypt(obj.motherName),
    spouseName: decrypt(obj.spouseName),
    fileNo: decrypt(obj.fileNo),
    oldPassportNo: decrypt(obj.oldPassportNo),
    createdAt: obj.createdAt
  };
};

module.exports = mongoose.models.Passport || mongoose.model('Passport', PassportSchema);
