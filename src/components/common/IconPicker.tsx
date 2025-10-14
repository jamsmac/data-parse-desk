import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Database,
  Table,
  FileText,
  Users,
  Settings,
  TrendingUp,
  BarChart,
  PieChart,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  CreditCard,
  Heart,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash,
  Plus,
  Minus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Home,
  Briefcase,
  Book,
  Globe,
  Zap,
  Target,
  Award,
  Flag,
  Bookmark,
  Tag,
  Folder,
  File,
  Image,
  Video,
  Music,
  Clock,
  Bell,
  MessageSquare,
  Send,
  Share,
  Link,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  RefreshCw,
  RotateCw,
  Save,
  Copy,
  Clipboard,
  Printer,
  Maximize,
  Minimize,
  Menu,
  MoreVertical,
  MoreHorizontal,
  Grid,
  List,
  Layers,
  Archive,
  Inbox,
  Box,
  type LucideIcon,
} from 'lucide-react';

const ICON_LIST: { name: string; icon: LucideIcon; category: string }[] = [
  // Базы данных и таблицы
  { name: 'Database', icon: Database, category: 'database' },
  { name: 'Table', icon: Table, category: 'database' },
  { name: 'FileText', icon: FileText, category: 'database' },
  { name: 'Folder', icon: Folder, category: 'database' },
  { name: 'File', icon: File, category: 'database' },
  { name: 'Archive', icon: Archive, category: 'database' },
  { name: 'Box', icon: Box, category: 'database' },
  { name: 'Layers', icon: Layers, category: 'database' },

  // Люди и организация
  { name: 'Users', icon: Users, category: 'people' },
  { name: 'Briefcase', icon: Briefcase, category: 'people' },
  { name: 'Home', icon: Home, category: 'people' },

  // Аналитика и графики
  { name: 'TrendingUp', icon: TrendingUp, category: 'analytics' },
  { name: 'BarChart', icon: BarChart, category: 'analytics' },
  { name: 'PieChart', icon: PieChart, category: 'analytics' },
  { name: 'Target', icon: Target, category: 'analytics' },

  // Контакты
  { name: 'Mail', icon: Mail, category: 'contacts' },
  { name: 'Phone', icon: Phone, category: 'contacts' },
  { name: 'MessageSquare', icon: MessageSquare, category: 'contacts' },
  { name: 'Send', icon: Send, category: 'contacts' },

  // Медиа
  { name: 'Image', icon: Image, category: 'media' },
  { name: 'Video', icon: Video, category: 'media' },
  { name: 'Music', icon: Music, category: 'media' },

  // Время и даты
  { name: 'Calendar', icon: Calendar, category: 'time' },
  { name: 'Clock', icon: Clock, category: 'time' },
  { name: 'Bell', icon: Bell, category: 'time' },

  // Коммерция
  { name: 'ShoppingCart', icon: ShoppingCart, category: 'commerce' },
  { name: 'Package', icon: Package, category: 'commerce' },
  { name: 'Truck', icon: Truck, category: 'commerce' },
  { name: 'DollarSign', icon: DollarSign, category: 'commerce' },
  { name: 'CreditCard', icon: CreditCard, category: 'commerce' },

  // Избранное и статусы
  { name: 'Heart', icon: Heart, category: 'status' },
  { name: 'Star', icon: Star, category: 'status' },
  { name: 'CheckCircle', icon: CheckCircle, category: 'status' },
  { name: 'AlertCircle', icon: AlertCircle, category: 'status' },
  { name: 'Info', icon: Info, category: 'status' },
  { name: 'Flag', icon: Flag, category: 'status' },
  { name: 'Award', icon: Award, category: 'status' },

  // Прочее
  { name: 'Settings', icon: Settings, category: 'other' },
  { name: 'MapPin', icon: MapPin, category: 'other' },
  { name: 'Book', icon: Book, category: 'other' },
  { name: 'Globe', icon: Globe, category: 'other' },
  { name: 'Zap', icon: Zap, category: 'other' },
  { name: 'Bookmark', icon: Bookmark, category: 'other' },
  { name: 'Tag', icon: Tag, category: 'other' },
  { name: 'Link', icon: Link, category: 'other' },
  { name: 'Shield', icon: Shield, category: 'other' },
  { name: 'Key', icon: Key, category: 'other' },
  { name: 'Inbox', icon: Inbox, category: 'other' },
];

const CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'database', label: 'Базы данных' },
  { value: 'people', label: 'Люди' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'contacts', label: 'Контакты' },
  { value: 'media', label: 'Медиа' },
  { value: 'time', label: 'Время' },
  { value: 'commerce', label: 'Коммерция' },
  { value: 'status', label: 'Статусы' },
  { value: 'other', label: 'Прочее' },
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const selectedIcon = ICON_LIST.find((icon) => icon.name === value);
  const SelectedIconComponent = selectedIcon?.icon || Database;

  const filteredIcons = ICON_LIST.filter((icon) => {
    const matchesSearch =
      searchQuery === '' ||
      icon.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start', className)}
        >
          <SelectedIconComponent className="mr-2 h-4 w-4" />
          {selectedIcon?.name || 'Выберите иконку'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Search */}
          <Input
            placeholder="Поиск иконок..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="h-7 text-xs"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Icons Grid */}
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-6 gap-2 pr-4">
              {filteredIcons.map((icon) => {
                const IconComponent = icon.icon;
                const isSelected = value === icon.name;
                return (
                  <Button
                    key={icon.name}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-10 w-10 p-0 hover:bg-primary/10',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
                    )}
                    onClick={() => handleSelect(icon.name)}
                    title={icon.name}
                  >
                    <IconComponent className="h-5 w-5" />
                  </Button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Иконки не найдены
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
