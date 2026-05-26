import RegistrationForm from '../components/RegistrationForm';
import { additionalRegistrationFields } from '../lib/registration-config';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <RegistrationForm additionalFields={additionalRegistrationFields} />
    </main>
  );
}
