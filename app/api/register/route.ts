import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../../../lib/supabase';
import { registrationFormSchema } from '../../../lib/validation';
import { additionalRegistrationFields } from '../../../lib/registration-config';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
      extraValues?: Record<string, string>;
    };

    const parsed = registrationFormSchema.safeParse({
      email: body.email ?? '',
      password: body.password ?? '',
      full_name: body.full_name ?? '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const password_hash = await bcrypt.hash(parsed.data.password, 12);
    const payload: Record<string, unknown> = {
      email: parsed.data.email,
      password_hash,
      full_name: parsed.data.full_name?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    const allowedAdditionalColumns = new Set(additionalRegistrationFields.map((field) => field.name));
    if (body.extraValues && typeof body.extraValues === 'object') {
      for (const [key, value] of Object.entries(body.extraValues)) {
        if (allowedAdditionalColumns.has(key)) {
          payload[key] = value?.trim() ? value.trim() : null;
        }
      }
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('registrations').insert([payload]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Registration submitted successfully.' }, { status: 201 });
  } catch (error) {
    console.error('Registration API failed:', error);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
