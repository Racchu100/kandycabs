import React from 'react';
import { Container } from '@/components/ui/Container';
import { CustomerLoginForm } from '@/components/auth/CustomerLoginForm';

export const metadata = {
  title: 'Customer Login — Kandy Cabs Mangaluru',
  description: 'Log in with your Mobile/Username & Password, or verify SMS OTP to set a new password.',
};

export default function LoginPage() {
  return (
    <section className="sec">
      <Container>
        <CustomerLoginForm />
      </Container>
    </section>
  );
}
