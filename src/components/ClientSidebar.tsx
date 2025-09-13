'use client';

import { useEffect, useState } from 'react';

import Sidebar from './Sidebar';

interface ClientSidebarProps {
  activePath?: string;
}

export default function ClientSidebar({ activePath }: ClientSidebarProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className='w-64 h-screen bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800'>
        <div className='flex items-center justify-center h-16'>
          <div className='animate-pulse bg-gray-300 dark:bg-gray-700 rounded w-20 h-6'></div>
        </div>
      </div>
    );
  }

  return <Sidebar activePath={activePath} />;
}
