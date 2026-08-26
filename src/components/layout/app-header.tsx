import Link from "next/link";
import { HeartHandshake } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 hidden sm:block">
            <p className="font-semibold text-foreground leading-tight truncate">
              Care Visit Log
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Photos, notes & family sync
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link
            href="/insights"
            className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Insights
          </Link>
          <Link
            href="/family"
            className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Family
          </Link>
          <Link
            href="/visits/new"
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Log visit
          </Link>
        </nav>
      </div>
    </header>
  );
}
