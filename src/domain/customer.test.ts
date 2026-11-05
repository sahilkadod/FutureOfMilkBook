import {
  normalizeCustomerInput,
  validateCustomerInput,
} from './customer';

describe('customer domain', () => {
  it('normalizes whitespace and phone formatting', () => {
    expect(
      normalizeCustomerInput({
        name: '  Ramesh   Patel  ',
        phone: '+91 98765-43210',
        address: '  Main   Road  ',
      }),
    ).toEqual({
      name: 'Ramesh Patel',
      phone: '+919876543210',
      address: 'Main Road',
    });
  });

  it('requires a customer name', () => {
    expect(validateCustomerInput({name: '   '})).toMatchObject({
      name: 'Customer name is required.',
    });
  });

  it('rejects malformed phone numbers', () => {
    expect(validateCustomerInput({name: 'Ramesh', phone: '12AB'})).toMatchObject({
      phone: 'Enter a valid phone number (7–15 digits).',
    });
  });

  it('allows partial updates without requiring a name', () => {
    expect(validateCustomerInput({address: 'Village Road'}, {partial: true})).toEqual({});
  });
});
