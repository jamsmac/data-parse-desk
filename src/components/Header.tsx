import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction Analyzer</h1>
          <p className="text-sm text-muted-foreground">Smart parsing & analytics</p>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          className="h-10 w-10"
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
