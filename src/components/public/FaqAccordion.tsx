'use client';

import React, { useState } from 'react';
import { FAQItem } from '@/types';

interface FaqAccordionProps {
  items: FAQItem[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="faq">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className={`faq-i ${isOpen ? 'on' : ''}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className="faq-a">
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
