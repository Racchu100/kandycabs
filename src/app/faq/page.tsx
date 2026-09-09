import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FaqAccordion } from '@/components/public/FaqAccordion';
import { FAQS } from '@/config/siteData';

export const metadata = {
  title: 'Frequently Asked Questions — Kandy Cabs Mangaluru',
  description: 'Everything you need to know about outstation fares, driver allowances, cancellation policy, payment modes, and vehicle permits.',
};

export default function FaqPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Got questions?"
          title="Frequently Asked Questions"
          lede="Everything you need to know about outstation taxi fares, payment modes, cancellation policies, and All-India permits."
        />
        <FaqAccordion items={FAQS} />
      </Container>
    </section>
  );
}
