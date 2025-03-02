import Layout from '../components/Layout';
import SignupForm from '../components/SignupForm';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="max-w-md mx-auto mt-16">
        <SignupForm />
      </div>
    </Layout>
  );
}
