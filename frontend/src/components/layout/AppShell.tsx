import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { GlobalSearchModal } from './GlobalSearchModal';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, pageTitle }) => {
  return (
    <div className="flex min-h-screen bg-background-secondary text-graphite">
      <Sidebar />
      <MobileNav />
      <GlobalSearchModal />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader pageTitle={pageTitle} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
};

