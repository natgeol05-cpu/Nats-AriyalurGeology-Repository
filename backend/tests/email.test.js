/**
 * Email validation unit tests
 */
const { isValidEmail, isValidPhone } = require('../server');

describe('isValidEmail', () => {
  const validEmails = [
    'user@example.com',
    'user.name@example.co.in',
    'user+tag@example.org',
    'user123@sub.domain.com',
    'USER@EXAMPLE.COM',
  ];

  const invalidEmails = [
    '',
    'not-an-email',
    '@example.com',
    'user@',
    'user @example.com',
    'user@example',
    'user@.com',
    null,
    undefined,
    12345,
  ];

  validEmails.forEach((email) => {
    it(`should accept valid email: ${email}`, () => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  invalidEmails.forEach((email) => {
    it(`should reject invalid email: ${JSON.stringify(email)}`, () => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

describe('isValidPhone', () => {
  const validPhones = [
    '9876543210',
    '+919876543210',
    '1234567',
    '+1234567890123',
  ];

  const invalidPhones = [
    '',
    'abc',
    '123',           // too short
    '12345678901234567', // too long
    '+',
    '98765 43210',   // contains space
    null,
    undefined,
  ];

  validPhones.forEach((phone) => {
    it(`should accept valid phone: ${phone}`, () => {
      expect(isValidPhone(phone)).toBe(true);
    });
  });

  invalidPhones.forEach((phone) => {
    it(`should reject invalid phone: ${JSON.stringify(phone)}`, () => {
      expect(isValidPhone(phone)).toBe(false);
    });
  });
});
