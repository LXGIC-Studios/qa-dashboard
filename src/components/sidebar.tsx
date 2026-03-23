"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileBarChart,
  Bug,
  LogOut,
  User,
  Zap,
  Bot,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dispatch", label: "Dispatch", icon: Zap },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data as Profile);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isAdmin = profile?.role === "admin";

  // Filter nav items based on role - reports only for admins
  const visibleNavItems = navItems.filter(
    (item) => item.href !== "/reports" || isAdmin
  );

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-card border-r border-card-border z-40 flex-col hidden md:flex">
        <div className="p-6 border-b border-card-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap size={18} className="text-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-[family-name:var(--font-heading)] tracking-tight">
                SDN
              </h1>
              <p className="text-[10px] text-muted uppercase tracking-widest">
                LXGIC Studios
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-card-border space-y-3">
          {profile && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                <User size={14} className="text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {profile.full_name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {profile.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted hover:text-accent-pink hover:bg-surface transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border flex items-center justify-around px-2 md:hidden safe-bottom">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-4 min-h-[56px] justify-center transition-colors ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-3 px-4 min-h-[56px] justify-center text-muted"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Sign Out</span>
        </button>
      </nav>
    </>
  );
}
