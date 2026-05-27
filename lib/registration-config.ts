export type AdditionalRegistrationField = {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
};

export const additionalRegistrationFields: AdditionalRegistrationField[] = [];
