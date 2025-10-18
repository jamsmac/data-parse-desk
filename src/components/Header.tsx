import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Database,
  LayoutDashboard,
  BarChart3,
  FileText,
  User,
  LogOut,
  Bell,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from './ui/badge';
import { AIAssistantPanel } from './ai/AIAssistantPanel';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const navigationItems = [
    {
      name: 'Дашборд',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Аналитика',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'Отчёты',
      path: '/reports',
      icon: FileText,
    },
  ];

  // Если пользователь не авторизован, показываем упрощённый хедер
  if (!user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">VHData</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Вход</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Регистрация</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">VHData</h1>
              <p className="text-xs text-muted-foreground">Data Management Platform</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'secondary' : 'ghost'}
                size="sm"
                asChild
                className="gap-2"
              >
                <Link to={item.path}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        {/* Right Side - AI Assistant, Notifications & User Menu */}
        <div className="flex items-center gap-2">
          {/* AI Assistant */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="gap-2 hover-scale"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden md:inline">AI Ассистент</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url as string} />
                  <AvatarFallback>
                    {getInitials(
                      user.user_metadata?.full_name as string,
                      user.email || undefined
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-sm font-medium">
                    {user.user_metadata?.full_name || 'Пользователь'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выход
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <AIAssistantPanel 
        open={isAIPanelOpen}
        onOpenChange={setIsAIPanelOpen}
      />
    </header>
  );
}
