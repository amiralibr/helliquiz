'use client';

import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="my-3 block text-center overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index}>{part}</code>;
          }
        }

        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline px-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index}>{part}</code>;
          }
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
