"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartLine, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { href: "/", label: "Today", icon: BookOpen },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/stats", label: "Stats", icon: ChartLine },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className='min-h-dvh bg-background'>
      <header className='sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60'>
        <div className='mx-auto flex h-14 max-w-5xl items-center justify-between px-4'>
          <Link href='/' className='font-semibold tracking-tight'>
            Brain Cycle
          </Link>
          <nav className='flex items-center gap-2'>
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: active ? "default" : "ghost", size: "sm" }),
                    "gap-2",
                  )}
                >
                  <Icon className='h-4 w-4' />
                  <span className='hidden sm:inline'>{item.label}</span>
                </Link>
              );
            })}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className='mx-auto w-full max-w-5xl px-4 py-6'>{children}</main>
    </div>
  );
}
