'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { registrationFormSchema, type RegistrationFormValues } from '../lib/validation';
import type { AdditionalRegistrationField } from '../lib/registration-config';

type RegistrationFormProps = {
  additionalFields?: AdditionalRegistrationField[];
};

const initialFormState: RegistrationFormValues = {
  email: '',
  password: '',
  full_name: '',
};

export default function RegistrationForm({ additionalFields = [] }: RegistrationFormProps) {
  const [formValues, setFormValues] = useState<RegistrationFormValues>(initialFormState);
  const [extraValues, setExtraValues] = useState<Record<string, string>>(
    Object.fromEntries(additionalFields.map((field) => [field.name, '']))
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedFields = useMemo(
    () => additionalFields.map((field) => ({ type: 'text' as const, ...field })),
    [additionalFields]
  );

  const onChange = (name: keyof RegistrationFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onExtraChange = (name: string, value: string) => {
    setExtraValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateExtraFields = () => {
    const errors: Record<string, string> = {};
    for (const field of normalizedFields) {
      if (field.required && !extraValues[field.name]?.trim()) {
        errors[field.name] = `${field.label} is required`;
      }
    }
    return errors;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    const parsed = registrationFormSchema.safeParse(formValues);
    const extraErrors = validateExtraFields();

    if (!parsed.success || Object.keys(extraErrors).length > 0) {
      const zodErrors = parsed.success
        ? {}
        : Object.fromEntries(
            Object.entries(parsed.error.flatten().fieldErrors)
              .filter(([, value]) => value?.[0])
              .map(([key, value]) => [key, value?.[0] ?? 'Invalid value'])
          );
      setFieldErrors({ ...zodErrors, ...extraErrors });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
          full_name: parsed.data.full_name,
          extraValues,
        }),
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        if (response.status === 409) {
          setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
          setStatusMessage({ type: 'error', text: 'Email already exists. Please use a different email.' });
          return;
        }
        setStatusMessage({ type: 'error', text: result.error || 'Registration failed. Please try again.' });
        return;
      }

      setStatusMessage({ type: 'success', text: result.message || 'Registration submitted successfully.' });
      setFormValues(initialFormState);
      setExtraValues(Object.fromEntries(normalizedFields.map((field) => [field.name, ''])));
      setFieldErrors({});
    } catch (error) {
      console.error('Registration request failed:', error);
      setStatusMessage({ type: 'error', text: 'Unexpected error occurred while submitting the form.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Register</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={formValues.email}
            onChange={(event) => onChange('email', event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="you@example.com"
          />
          {fieldErrors.email ? <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password <span className="text-red-600">*</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={formValues.password}
            onChange={(event) => onChange('password', event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Create a strong password"
          />
          {fieldErrors.password ? <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p> : null}
        </div>

        <div>
          <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            value={formValues.full_name ?? ''}
            onChange={(event) => onChange('full_name', event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Your full name"
          />
          {fieldErrors.full_name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.full_name}</p> : null}
        </div>

        {normalizedFields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="mb-1 block text-sm font-medium text-gray-700">
              {field.label} {field.required ? <span className="text-red-600">*</span> : null}
            </label>
            <input
              id={field.name}
              type={field.type}
              required={field.required}
              value={extraValues[field.name] ?? ''}
              onChange={(event) => onExtraChange(field.name, event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={field.placeholder}
            />
            {fieldErrors[field.name] ? <p className="mt-1 text-sm text-red-600">{fieldErrors[field.name]}</p> : null}
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
      </button>

      {statusMessage ? (
        <div
          role="status"
          className={`mt-4 rounded-md p-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200'
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}
    </form>
  );
}
