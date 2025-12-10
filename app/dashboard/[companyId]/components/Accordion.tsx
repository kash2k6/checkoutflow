'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-a4 rounded-lg overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 md:p-4 bg-gray-a2 hover:bg-gray-a3 transition-colors text-left min-h-[44px] touch-manipulation"
      >
        <span className="font-semibold text-gray-12 text-sm md:text-base">{title}</span>
        <ChevronDown
          className={`w-4 h-4 md:w-5 md:h-5 text-gray-10 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-3 md:p-4 bg-gray-a1 border-t border-gray-a4">
          {children}
        </div>
      )}
    </div>
  );
}

