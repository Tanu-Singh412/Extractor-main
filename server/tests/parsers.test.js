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
