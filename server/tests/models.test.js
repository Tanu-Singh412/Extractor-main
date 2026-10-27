const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Passport, Insurance, createModelFromOcr } = require('../src/models');
const { encrypt, decrypt, isEncrypted, hashSearchIndex } = require('../src/services/encryption.service');

test('Encryption service correctly encrypts and decrypts with AES-256-GCM', () => {
  const sample = 'PASSPORT-A99887766';
  const ciphertext = encrypt(sample);

  assert.ok(isEncrypted(ciphertext), 'Ciphertext should conform to iv:authTag:cipher structure');
  assert.notEqual(ciphertext, sample, 'Ciphertext should be obfuscated');

  const plaintext = decrypt(ciphertext);
  assert.equal(plaintext, sample, 'Decryption must perfectly reconstruct the plaintext');
});

test('Passport model encrypts sensitive fields at rest and decrypts on access', () => {
  const ocrData = {
    docType: 'PASSPORT',
    passportNo: 'Z9876543',
    issuingCountry: 'USA',
    nationality: 'USA',
    firstName: 'John',
    lastName: 'Doe',
    sex: 'M',
    dob: '1985-06-15',
    doe: '2032-06-14',
    issueDate: '2022-06-15',
    placeOfBirth: 'CALIFORNIA',
    placeOfIssue: 'WASHINGTON',
    address: '123 Sunset Blvd, Los Angeles, CA',
    phone: '+1 555-123-4567',
    email: 'john.doe@example.com',
    fatherName: 'Robert Doe',
    motherName: 'Mary Doe',
    spouseName: 'Jane Doe',
    mrzLine1: 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'Z9876543<8USA8506154M3206148<<<<<<<<<<<<<<04',
    mrzValid: true
  };

  const passportDoc = Passport.fromOcr(ocrData, 'Raw OCR dump text', 'passport-sample.jpg');

  // Verify search hash is generated
  assert.equal(passportDoc.passportNoHash, hashSearchIndex('Z9876543'));

  // Verify raw stored value in document is encrypted
  const rawStoredPassportNo = passportDoc.get('passportNo', null, { getters: false });
  assert.ok(isEncrypted(rawStoredPassportNo), 'Stored passport number must be encrypted at rest');

  const rawStoredPhone = passportDoc.get('phone', null, { getters: false });
  assert.ok(isEncrypted(rawStoredPhone), 'Stored passport phone must be encrypted at rest');

  // Verify getter provides decrypted plaintext
  assert.equal(passportDoc.passportNo, 'Z9876543');
  assert.equal(passportDoc.firstName, 'John');
  assert.equal(passportDoc.lastName, 'DOE');
  assert.equal(passportDoc.fullName, 'John DOE');
  assert.equal(passportDoc.nationality, 'USA');
  assert.equal(passportDoc.sex, 'M');
  assert.equal(passportDoc.dob, '1985-06-15');
  assert.equal(passportDoc.doe, '2032-06-14');
  assert.equal(passportDoc.phone, '+1 555-123-4567');
  assert.equal(passportDoc.email, 'john.doe@example.com');
  assert.equal(passportDoc.mrz.valid, true);
  assert.equal(passportDoc.extraction.sourceFileName, 'passport-sample.jpg');
  assert.equal(passportDoc.isValid, true);

  // Test registry format serialization (all decrypted clean data)
  const registryFormat = passportDoc.toRegistryFormat();
  assert.equal(registryFormat.docType, 'PASSPORT');
  assert.equal(registryFormat.passportNo, 'Z9876543');
  assert.equal(registryFormat.firstName, 'John');
  assert.equal(registryFormat.lastName, 'DOE');
  assert.equal(registryFormat.fatherName, 'Robert Doe');
  assert.equal(registryFormat.address, '123 Sunset Blvd, Los Angeles, CA');
  assert.equal(registryFormat.phone, '+1 555-123-4567');
  assert.equal(registryFormat.email, 'john.doe@example.com');
});

test('Insurance model encrypts policy number, contact and subfields at rest', () => {
  const healthOcr = {
    docType: 'INSURANCE',
    insuranceType: 'HEALTH',
    policyNo: 'HL-2026-998877',
    provider: 'Star Health',
    memberName: 'Pooja Verma',
    effectiveDate: '2026-01-01',
    doe: '2027-01-01',
    phone: '+91 9876543210',
    email: 'pooja.verma@example.com',
    healthCardNo: 'UHID-445566',
    tpa: 'MediAssist TPA',
    networkHospital: 'Apollo Hospital',
    sumInsured: '1000000',
    copayPercentage: '10%'
  };

  const insuranceDoc = Insurance.fromOcr(healthOcr, 'Sample Health Text', 'health-card.png');

  // Verify search hash is generated
  assert.equal(insuranceDoc.policyNoHash, hashSearchIndex('HL-2026-998877'));

  // Raw stored policyNo is encrypted
  const rawStoredPolicyNo = insuranceDoc.get('policyNo', null, { getters: false });
  assert.ok(isEncrypted(rawStoredPolicyNo), 'Stored policy number must be encrypted at rest');

  // Getters provide decrypted clean fields
  assert.equal(insuranceDoc.policyNo, 'HL-2026-998877');
  assert.equal(insuranceDoc.insuranceType, 'HEALTH');
  assert.equal(insuranceDoc.provider, 'Star Health');
  assert.equal(insuranceDoc.memberName, 'Pooja Verma');
  assert.equal(insuranceDoc.firstName, 'Pooja');
  assert.equal(insuranceDoc.lastName, 'Verma');
  assert.equal(insuranceDoc.phone, '+91 9876543210');
  assert.equal(insuranceDoc.health.healthCardNo, 'UHID-445566');
  assert.equal(insuranceDoc.health.sumInsured, '1000000');
  assert.equal(insuranceDoc.health.tpa, 'MediAssist TPA');

  // Verify flat registry format
  const regFormat = insuranceDoc.toRegistryFormat();
  assert.equal(regFormat.policyNo, 'HL-2026-998877');
  assert.equal(regFormat.phone, '+91 9876543210');
  assert.equal(regFormat.healthCardNo, 'UHID-445566');
  assert.equal(regFormat.tpa, 'MediAssist TPA');
});

test('Insurance model validates and maps motor insurance OCR data', () => {
  const motorOcr = {
    docType: 'INSURANCE',
    insuranceType: 'MOTOR',
    policyNo: 'MOT-77889900',
    provider: 'Bajaj Allianz',
    memberName: 'Vikram Singh',
    vehicleNo: 'MH-02-CD-1234',
    registrationNo: 'MH-02-CD-1234',
    vehicleType: 'CAR',
    make: 'Maruti Suzuki',
    model: 'Swift Dzire',
    variant: 'ZXI Plus',
    manufacturingYear: '2023',
    engineNo: 'K12M1234567',
    chassisNo: 'MBH1234567890ABCD',
    idv: '650000',
    ncb: '20%'
  };

  const motorDoc = Insurance.fromOcr(motorOcr);

  assert.equal(motorDoc.policyNo, 'MOT-77889900');
  assert.equal(motorDoc.motor.vehicleNo, 'MH-02-CD-1234');
  assert.equal(motorDoc.motor.make, 'Maruti Suzuki');
  assert.equal(motorDoc.motor.model, 'Swift Dzire');
  assert.equal(motorDoc.motor.chassisNo, 'MBH1234567890ABCD');

  const regFormat = motorDoc.toRegistryFormat();
  assert.equal(regFormat.vehicleNo, 'MH-02-CD-1234');
  assert.equal(regFormat.make, 'Maruti Suzuki');
  assert.equal(regFormat.chassisNo, 'MBH1234567890ABCD');
});

test('createModelFromOcr factory routes to correct model instance', () => {
  const pDoc = createModelFromOcr({ docType: 'PASSPORT', passportNo: 'P112233' });
  const iDoc = createModelFromOcr({ docType: 'INSURANCE', policyNo: 'POL4455', provider: 'HDFC' });

  assert.equal(pDoc.constructor.modelName, 'Passport');
  assert.equal(iDoc.constructor.modelName, 'Insurance');
});
