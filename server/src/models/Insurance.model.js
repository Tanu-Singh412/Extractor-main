const mongoose = require('mongoose');
const { encrypt, decrypt, hashSearchIndex } = require('../services/encryption.service');

const HealthDetailsSchema = new mongoose.Schema({
  healthCardNo: { type: String, trim: true, default: '', set: encrypt, get: decrypt },
  tpa: { type: String, trim: true, default: '' },
  networkHospital: { type: String, trim: true, default: '' },
  copayPercentage: { type: String, trim: true, default: '' },
  sumInsured: { type: String, trim: true, default: '' },
  roomRentLimit: { type: String, trim: true, default: '' },
  hospitalizationLimit: { type: String, trim: true, default: '' },
  waitingPeriod: { type: String, trim: true, default: '' },
  preExistingDisease: { type: String, trim: true, default: '' }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const MotorDetailsSchema = new mongoose.Schema({
  vehicleNo: { type: String, trim: true, uppercase: true, default: '' },
  registrationNo: { type: String, trim: true, uppercase: true, default: '' },
  vehicleType: { type: String, trim: true, default: '' },
  make: { type: String, trim: true, default: '' },
  model: { type: String, trim: true, default: '' },
  variant: { type: String, trim: true, default: '' },
  engineNo: { type: String, trim: true, uppercase: true, default: '', set: encrypt, get: decrypt },
  chassisNo: { type: String, trim: true, uppercase: true, default: '', set: encrypt, get: decrypt },
  manufacturingYear: { type: String, trim: true, default: '' },
  idv: { type: String, trim: true, default: '' },
  ncb: { type: String, trim: true, default: '' },
  fuelType: { type: String, trim: true, default: '' }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const LifeDetailsSchema = new mongoose.Schema({
  lifeAssured: { type: String, trim: true, default: '' },
  nomineeName: { type: String, trim: true, default: '', set: encrypt, get: decrypt },
  nomineeRelation: { type: String, trim: true, default: '' },
  premium: { type: String, trim: true, default: '' },
  premiumFrequency: { type: String, trim: true, default: '' },
  deathBenefit: { type: String, trim: true, default: '' },
  maturityBenefit: { type: String, trim: true, default: '' },
  maturityDate: { type: String, trim: true, default: '' },
  policyTermYears: { type: String, trim: true, default: '' }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const TravelDetailsSchema = new mongoose.Schema({
  destination: { type: String, trim: true, default: '' },
  departureCountry: { type: String, trim: true, default: '' },
  arrivalCountry: { type: String, trim: true, default: '' },
  travelStartDate: { type: String, trim: true, default: '' },
  travelEndDate: { type: String, trim: true, default: '' },
  tripType: { type: String, trim: true, default: '' },
  travellerCount: { type: String, trim: true, default: '' }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const ExtractionMetadataSchema = new mongoose.Schema({
  rawText: { type: String, default: '' },
  sourceFileName: { type: String, default: '' },
  extractionEngine: { type: String, default: 'tesseract' },
  confidenceScore: { type: Number, default: 0 },
  extractedAt: { type: Date, default: Date.now }
}, { _id: false });

const InsuranceSchema = new mongoose.Schema({
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
    default: 'INSURANCE',
    uppercase: true,
    enum: ['INSURANCE']
  },

  // Document Identifiers (Encrypted at rest with blind search index hash)
  policyNo: {
    type: String,
    required: true,
    trim: true,
    set: encrypt,
    get: decrypt
  },
  policyNoHash: {
    type: String,
    index: true
  },
  provider: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  insuranceType: {
    type: String,
    trim: true,
    uppercase: true,
    enum: ['HEALTH', 'MOTOR', 'CAR', 'LIFE', 'TRAVEL', 'GENERAL', 'OTHER', ''],
    default: 'GENERAL'
  },

  // Policy Holder Details
  memberName: {
    type: String,
    trim: true,
    default: ''
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  groupNo: {
    type: String,
    trim: true,
    default: ''
  },

  // Dates (Stored as ISO Strings YYYY-MM-DD for lossless OCR alignment)
  dob: {
    type: String,
    trim: true,
    default: ''
  },
  effectiveDate: {
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
  address: {
    type: String,
    trim: true,
    default: '',
    set: encrypt,
    get: decrypt
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String,
    trim: true,
    default: ''
  },

  // Policy Status
  policyStatus: {
    type: String,
    trim: true,
    default: 'ACTIVE'
  },

  // Specialized Sub-Category Data
  health: {
    type: HealthDetailsSchema,
    default: () => ({})
  },
  motor: {
    type: MotorDetailsSchema,
    default: () => ({})
  },
  life: {
    type: LifeDetailsSchema,
    default: () => ({})
  },
  travel: {
    type: TravelDetailsSchema,
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
InsuranceSchema.pre('save', function (next) {
  if (this.policyNo) {
    this.policyNoHash = hashSearchIndex(decrypt(this.policyNo));
  }
  next();
});

// Indexes for fast lookup
InsuranceSchema.index({ policyNoHash: 1, provider: 1 });
InsuranceSchema.index({ memberName: 'text', provider: 'text' });

// Virtuals
InsuranceSchema.virtual('isValid').get(function () {
  if (!this.doe) return true;
  const expiry = new Date(this.doe);
  if (isNaN(expiry.getTime())) return true;
  return expiry >= new Date();
});

InsuranceSchema.virtual('isExpiringSoon').get(function () {
  if (!this.doe) return false;
  const expiry = new Date(this.doe);
  if (isNaN(expiry.getTime())) return false;
  const today = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(today.getMonth() + 6);
  return expiry >= today && expiry <= sixMonths;
});

// Static Methods
InsuranceSchema.statics.fromOcr = function (ocrData, rawText = '', sourceFileName = '') {
  let mName = ocrData.memberName || '';
  if (!mName && (ocrData.firstName || ocrData.lastName)) {
    mName = `${ocrData.firstName || ''} ${ocrData.lastName || ''}`.trim();
  }
  const nameParts = mName.split(/\s+/);
  const fName = ocrData.firstName || nameParts[0] || '';
  const lName = ocrData.lastName || nameParts.slice(1).join(' ') || '';

  const subType = (ocrData.insuranceType || 'GENERAL').toUpperCase();
  const rawPolicyNo = (ocrData.policyNo || '').trim().toUpperCase();

  return new this({
    id: ocrData.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    docType: 'INSURANCE',
    policyNo: rawPolicyNo,
    policyNoHash: hashSearchIndex(rawPolicyNo),
    provider: ocrData.provider || '',
    insuranceType: subType,
    memberName: mName,
    firstName: fName,
    lastName: lName,
    groupNo: ocrData.groupNo || '',
    dob: ocrData.dob || '',
    effectiveDate: ocrData.effectiveDate || '',
    doe: ocrData.doe || '',
    phone: ocrData.phone || '',
    email: ocrData.email || '',
    address: ocrData.address || '',
    city: ocrData.city || '',
    state: ocrData.state || '',
    country: ocrData.country || '',
    pincode: ocrData.pincode || '',
    health: {
      healthCardNo: ocrData.healthCardNo || '',
      tpa: ocrData.tpa || '',
      networkHospital: ocrData.networkHospital || '',
      copayPercentage: ocrData.copayPercentage || '',
      sumInsured: ocrData.sumInsured || '',
      roomRentLimit: ocrData.roomRentLimit || '',
      hospitalizationLimit: ocrData.hospitalizationLimit || '',
      waitingPeriod: ocrData.waitingPeriod || '',
      preExistingDisease: ocrData.preExistingDisease || ''
    },
    motor: {
      vehicleNo: ocrData.vehicleNo || '',
      registrationNo: ocrData.registrationNo || '',
      vehicleType: ocrData.vehicleType || '',
      make: ocrData.make || '',
      model: ocrData.model || '',
      variant: ocrData.variant || '',
      engineNo: ocrData.engineNo || '',
      chassisNo: ocrData.chassisNo || '',
      manufacturingYear: ocrData.manufacturingYear || '',
      idv: ocrData.idv || '',
      ncb: ocrData.ncb || '',
      fuelType: ocrData.fuelType || ''
    },
    life: {
      lifeAssured: ocrData.lifeAssured || '',
      nomineeName: ocrData.nomineeName || '',
      nomineeRelation: ocrData.nomineeRelation || '',
      premium: ocrData.premium || '',
      premiumFrequency: ocrData.premiumFrequency || '',
      deathBenefit: ocrData.deathBenefit || '',
      maturityBenefit: ocrData.maturityBenefit || '',
      maturityDate: ocrData.maturityDate || '',
      policyTermYears: ocrData.policyTermYears || ''
    },
    travel: {
      destination: ocrData.destination || '',
      departureCountry: ocrData.departureCountry || '',
      arrivalCountry: ocrData.arrivalCountry || '',
      travelStartDate: ocrData.travelStartDate || '',
      travelEndDate: ocrData.travelEndDate || '',
      tripType: ocrData.tripType || '',
      travellerCount: ocrData.travellerCount || ''
    },
    extraction: {
      rawText: rawText || ocrData.rawText || '',
      sourceFileName: sourceFileName || ocrData.fileName || '',
      extractedAt: new Date()
    }
  });
};

InsuranceSchema.statics.findByPolicyNo = function (policyNo) {
  if (!policyNo) return null;
  const hash = hashSearchIndex(policyNo);
  return this.findOne({ policyNoHash: hash });
};

InsuranceSchema.statics.findExpiringSoon = function (months = 6) {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + months);
  const maxDate = targetDate.toISOString().split('T')[0];

  return this.find({
    doe: { $gte: today, $lte: maxDate }
  }).sort({ doe: 1 });
};

// Instance Methods
InsuranceSchema.methods.toRegistryFormat = function () {
  const obj = this.toObject();
  const flat = {
    id: obj.id,
    docType: 'INSURANCE',
    policyNo: decrypt(obj.policyNo),
    provider: obj.provider,
    insuranceType: obj.insuranceType,
    memberName: obj.memberName,
    firstName: obj.firstName,
    lastName: obj.lastName,
    groupNo: obj.groupNo,
    dob: obj.dob,
    effectiveDate: obj.effectiveDate,
    doe: obj.doe,
    phone: decrypt(obj.phone),
    email: decrypt(obj.email),
    address: decrypt(obj.address),
    city: obj.city,
    state: obj.state,
    country: obj.country,
    pincode: obj.pincode,
    createdAt: obj.createdAt
  };

  // Flatten sub-category details for simple consumption
  if (obj.health) {
    Object.assign(flat, {
      ...obj.health,
      healthCardNo: decrypt(obj.health.healthCardNo)
    });
  }
  if (obj.motor) {
    Object.assign(flat, {
      ...obj.motor,
      engineNo: decrypt(obj.motor.engineNo),
      chassisNo: decrypt(obj.motor.chassisNo)
    });
  }
  if (obj.life) {
    Object.assign(flat, {
      ...obj.life,
      nomineeName: decrypt(obj.life.nomineeName)
    });
  }
  if (obj.travel) {
    Object.assign(flat, obj.travel);
  }

  return flat;
};

module.exports = mongoose.models.Insurance || mongoose.model('Insurance', InsuranceSchema);
