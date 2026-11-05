export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  status?: CustomerStatus;
}

export type CustomerField = 'name' | 'phone' | 'address';

export type CustomerValidationErrors = Partial<Record<CustomerField, string>>;

/**
 * Normalizes user-entered customer data before it is persisted.
 * Phone numbers are stored as digits with an optional leading +.
 */
export function normalizeCustomerInput(
  input: CreateCustomerInput | UpdateCustomerInput,
): CreateCustomerInput | UpdateCustomerInput {
  return {
    ...(input.name !== undefined ? {name: input.name.trim().replace(/\\s+/g, ' ')} : {}),
    ...(input.phone !== undefined
      ? {phone: input.phone.trim().replace(/[\\s()-]/g, '')}
      : {}),
    ...(input.address !== undefined
      ? {address: input.address.trim().replace(/\\s+/g, ' ')}
      : {}),
    ...('status' in input && input.status !== undefined
      ? {status: input.status}
      : {}),
  };
}

export function validateCustomerInput(
  input: CreateCustomerInput | UpdateCustomerInput,
  options: {partial?: boolean} = {},
): CustomerValidationErrors {
  const normalized = normalizeCustomerInput(input);
  const errors: CustomerValidationErrors = {};

  if (!options.partial || normalized.name !== undefined) {
    if (!normalized.name) {
      errors.name = 'Customer name is required.';
    } else if (normalized.name.length > 100) {
      errors.name = 'Customer name must be 100 characters or fewer.';
    }
  }

  if (normalized.phone !== undefined && normalized.phone !== '') {
    if (!/^\\+?[0-9]{7,15}$/.test(normalized.phone)) {
      errors.phone = 'Enter a valid phone number (7–15 digits).';
    }
  }

  if (normalized.address !== undefined && normalized.address.length > 250) {
    errors.address = 'Address must be 250 characters or fewer.';
  }

  return errors;
}

/**
 * Repository contract shared by browser/API and mobile data adapters.
 * Every operation is explicitly scoped to the authenticated owner's userId.
 */
export interface CustomerRepository {
  list(userId: string): Promise<Customer[]>;
  getById(userId: string, customerId: string): Promise<Customer | null>;
  create(userId: string, input: CreateCustomerInput): Promise<Customer>;
  update(
    userId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<Customer | null>;
  archive(userId: string, customerId: string): Promise<boolean>;
}
