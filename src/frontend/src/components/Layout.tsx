import { Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { Heart } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Toaster />
      <footer className="border-t border-border bg-card py-6 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            © {new Date().getFullYear()} Advance Signal Pro. Feito com <Heart className="w-4 h-4 text-red-500 fill-red-500" /> usando{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.hostname : 'advance-signal-pro'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
