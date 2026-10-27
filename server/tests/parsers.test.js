const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createTestRuntime } = require('./helpers/test-runtime');

test('passport stages retain MRZ identity and labeled issue date', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const { parsePassportText } = runtime.load('src/parsers');
    const check = value => [...value].reduce((sum, char, i) => sum + (char === '<' ? 0 : parseInt(char, 36)) * [7, 3, 1][i % 3], 0) % 10;
    const number = 'A1234567<', dob = '900312', expiry = '300312', personal = '<'.repeat(14);
    const first = number + check(number), second = dob + check(dob), third = expiry + check(expiry) + personal + check(personal);
    const text = [
        'PASSPORT', 'Surname: ANDERSON', 'Given Names: JANE ALICE',
        'Date of Issue: 12/03/2020',
        'P<UTO' + 'ANDERSON<<JANE<ALICE'.padEnd(39, '<'),
        first + 'UTO' + second + 'F' + third + check(first + second + third)
    ].join('\n');
    const result = await parsePassportText(text);
    assert.equal(result.passportNo, 'A1234567');
    assert.equal(result.surname, 'Anderson');
    assert.equal(result.givenNames, 'Jane Alice');
    assert.equal(result.dob, '1990-03-12');
    assert.equal(result.doe, '2030-03-12');
    assert.equal(result.issueDate, '2020-03-12');
    assert.equal(result.nationality, 'UTO');
});

test('insurance parser loads patterns and writes OCR output to its configured path', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const fs = require('node:fs');
    const { parseInsuranceText } = runtime.load('src/parsers');
    const text = 'HEALTH INSURANCE\nPolicy No: H12345678\nMember Name: JANE ANDERSON\nEffective Date: 01/01/2026\nExpiry Date: 31/12/2026\nSum Insured: INR 500000';
    const result = await parseInsuranceText(text);
    assert.equal(result.policyNo, 'H12345678');
    assert.equal(result.memberName, 'Jane Anderson');
    assert.equal(result.insuranceType, 'HEALTH');
    assert.equal(result.effectiveDate, '2026-01-01');
    assert.equal(result.doe, '2026-12-31');
    assert.equal(result.sumInsured, '500000');
    assert.equal(fs.readFileSync(runtime.paths.OCR_OUTPUT_FILE, 'utf8'), text);
});

test('motor insurance parser extracts policy number with dashes, DD-MMM-YYYY dates, and vehicle details', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const { parseInsuranceText } = runtime.load('src/parsers');
    const text = [
        'HDFC ERGO GENERAL INSURANCE COMPANY LIMITED',
        'CERTIFICATE OF INSURANCE CUM POLICY SCHEDULE',
        'Policy No: OG-24-9906-1801-00000001',
        'Name of Insured: Mr. Rahul Sharma',
        'Period of Insurance: From 15-AUG-2023 00:00 To 14-AUG-2024 23:59',
        'Registration No: MH 02 AB 1234',
        'Make: HONDA',
        'Model: CITY ZX',
        'Engine No: ENG12345678',
        'Chassis No: CHS9876543210123',
        'Fuel Type: PETROL',
        'Insured Declared Value (IDV): Rs. 7,50,000',
        'Contact: +91 9876543210',
        'Email: rahul.sharma@example.com'
    ].join('\n');

    const result = await parseInsuranceText(text);
    assert.equal(result.policyNo, 'OG-24-9906-1801-00000001');
    assert.equal(result.provider, 'Hdfc Ergo');
    assert.equal(result.memberName, 'Rahul Sharma');
    assert.equal(result.effectiveDate, '2023-08-15');
    assert.equal(result.doe, '2024-08-14');
    assert.equal(result.registrationNo, 'MH 02 AB 1234');
    assert.equal(result.make, 'Honda');
    assert.equal(result.engineNo, 'ENG12345678');
    assert.equal(result.chassisNo, 'CHS9876543210123');
    assert.equal(result.fuelType, 'Petrol');
    assert.equal(result.idv, '7,50,000');
    assert.equal(result.phone, '+91 9876543210');
    assert.equal(result.email, 'rahul.sharma@example.com');
});

test('passport MRZ parser recovers line 1 when noisy characters precede P<', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const { parsePassportText } = runtime.load('src/parsers');
    const check = value => [...value].reduce((sum, char, i) => sum + (char === '<' ? 0 : parseInt(char, 36)) * [7, 3, 1][i % 3], 0) % 10;
    const number = 'Z9876543<', dob = '920815', expiry = '320814', personal = '<'.repeat(14);
    const first = number + check(number), second = dob + check(dob), third = expiry + check(expiry) + personal + check(personal);
    const text = [
        'PASSPORT',
        '1P<IND' + 'SHARMA<<AMIT'.padEnd(39, '<'),
        first + 'IND' + second + 'M' + third + check(first + second + third)
    ].join('\n');

    const result = await parsePassportText(text);
    assert.equal(result.passportNo, 'Z9876543');
    assert.equal(result.surname, 'Sharma');
    assert.equal(result.givenNames, 'Amit');
    assert.equal(result.nationality, 'IND');
    assert.equal(result.dob, '1992-08-15');
    assert.equal(result.doe, '2032-08-14');
});

test('insurance parser handles Policy / Certificate No with slashes, multi-line dates, and combined engine & chassis', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const { parseInsuranceText } = runtime.load('src/parsers');
    const text = [
        'SCHEDULE CUM CERTIFICATE',
        'ACT ONLY INSURANCE POLICY - TWO WHEELER',
        'Policy / Certificate No : POPM2W00104570296',
        'Policy Issue Date : 13/08/2026',
        'Name : Mr. Test User',
        'Period of Insurance TP : From : 14/08/2026 12:43:00',
        'To : 13/08/2027 23:59:59',
        'ABOUT YOUR VEHICLE',
        'Vehicle Make Model & Variant: Honda Motorcycles, Activa & 5G Standard',
        'Registration Number: MP06S0206',
        'Engine & Chassis Number: JC44E0248187 & ME4JC445H98238320',
        'Manufacturing Year: 2009',
        'Fuel: Petrol',
        'Address: S A F Road, Morena, Madhya Pradesh - 476001, India.',
        'Contact No: 9876543210',
        'Email Id: test.user@example.com'
    ].join('\n');

    const result = await parseInsuranceText(text);
    assert.equal(result.policyNo, 'POPM2W00104570296');
    assert.equal(result.memberName, 'Test User');
    assert.equal(result.effectiveDate, '2026-08-14');
    assert.equal(result.doe, '2027-08-13');
    assert.equal(result.registrationNo, 'MP06S0206');
    assert.equal(result.make, 'Honda Motorcycles');
    assert.equal(result.model, 'Activa');
    assert.equal(result.variant, '5g Standard');
    assert.equal(result.engineNo, 'JC44E0248187');
    assert.equal(result.chassisNo, 'ME4JC445H98238320');
    assert.equal(result.manufacturingYear, '2009');
    assert.equal(result.fuelType, 'Petrol');
    assert.equal(result.phone, '9876543210');
    assert.equal(result.email, 'test.user@example.com');
});

test('passport parser preserves full Indian address including PIN, city, state and place of birth', async t => {
    const runtime = createTestRuntime();
    t.after(runtime.dispose);
    const { parsePassportText } = runtime.load('src/parsers');
    const text = [
        'REPUBLIC OF INDIA',
        'Passport No. C1234567',
        'Surname: AGARWAL',
        'Given Name(s): TESTPERSON',
        'Place of Birth: AGRA, UTTAR PRADESH',
        'Place of Issue: GHAZIABAD',
        'Date of Issue: 12/11/2024',
        'Date of Expiry: 11/11/2034',
        'Name of Father / Legal Guardian',
        'DINESH KUMAR AGARWAL',
        'Name of Mother',
        'ASHA AGARWAL',
        'Name of Spouse',
        'SUNITA AGARWAL',
        'Address',
        '208, BIBHAV RESIDENCY APPARTMENT',
        'BIBHAV NAGAR, AGRA',
        'PIN:282001, UTTAR PRADESH, INDIA',
        'Old Passport No. with Date and Place of Issue',
        'M7713899 15/04/2015 GHAZIABAD',
        'File No. GZ2070303899424'
    ].join('\n');

    const result = await parsePassportText(text);
    assert.equal(result.passportNo, 'C1234567');
    assert.equal(result.surname, 'Agarwal');
    assert.equal(result.givenNames, 'Testperson');
    assert.equal(result.fatherName, 'DINESH KUMAR AGARWAL');
    assert.equal(result.motherName, 'ASHA AGARWAL');
    assert.equal(result.spouseName, 'SUNITA AGARWAL');
    assert.equal(result.placeOfBirth, 'AGRA, UTTAR PRADESH');
    assert.equal(result.placeOfIssue, 'GHAZIABAD');
    assert.equal(result.issueDate, '2024-11-12');
    assert.equal(result.doe, '2034-11-11');
    assert.ok(result.address.includes('282001'));
    assert.ok(result.address.includes('AGRA'));
    assert.equal(result.oldPassportNo, 'M7713899');
    assert.equal(result.fileNo, 'GZ2070303899424');
});

