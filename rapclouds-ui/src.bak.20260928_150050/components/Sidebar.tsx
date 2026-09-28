import type { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      className="sidebar-responsive bg-bg-card border-l border-border overflow-y-auto flex flex-col gap-4"
      style={{ gridArea: 'sidebar', padding: 20 }}
    >
      {children}
    </aside>
  );
}
