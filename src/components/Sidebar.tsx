"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Settings, 
  LogOut,
  Heart,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Staff Team', icon: Users, href: '/staff' },
  { label: 'Service Users', icon: UserCheck, href: '/users' },
  { label: 'Weekly Rota', icon: CalendarDays, href: '/weekly' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center calm-shadow">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">CARERO</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 group",
                isActive 
                  ? "bg-primary-50 text-primary-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary-500" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 mt-auto space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all group"
        >
          <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          Settings
        </Link>
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 transition-all group"
        >
          <LogOut className="w-5 h-5 text-rose-400 group-hover:text-rose-500" />
          Sign Out
        </button>
      </div>

      {/* User Info */}
      <div className="p-6 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-sm">
            <div className="w-full h-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-xs">
              JD
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Jane Doe</p>
            <p className="text-xs font-medium text-slate-400">Centre Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
