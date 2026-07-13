'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const getBreadcrumbs = (path: string): BreadcrumbItem[] => {
    const parts = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Filter out route groups like (dashboard), (auth), etc.
    const cleanParts = parts.filter((part) => !part.startsWith('(') && !part.endsWith(')'));

    let currentHref = '';
    cleanParts.forEach((part, index) => {
      currentHref += `/${part}`;
      // Format segment name
      let label = part.charAt(0).toUpperCase() + part.slice(1);
      
      // Handle special IDs or formats
      if (part === 'new') label = 'Create';
      if (part === 'edit') label = 'Edit';
      if (part.match(/^[a-fA-F0-9]{24}$/)) label = 'Details'; // Mongo ObjectId placeholder

      breadcrumbs.push({
        label,
        href: index === cleanParts.length - 1 ? undefined : currentHref,
      });
    });

    return breadcrumbs;
  };

  const items = getBreadcrumbs(pathname);

  if (items.length <= 1) return null;

  return (
    <nav className="flex text-xs font-medium text-gray-500 select-none" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <span className="text-gray-400">Home</span>
        </li>
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            <svg className="mx-1 h-3 w-3 stroke-current text-gray-600" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {item.href ? (
              <Link href={item.href} className="text-gray-400 hover:text-gray-200 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-200 font-semibold">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
