import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Subtle top ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-gradient-to-b from-sky-500/5 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden transition-all">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
