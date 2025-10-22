/**
 * UserCell - User selector in table cell
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface UserCellProps {
  value?: string | null;  // user_id
  users: User[];
  onChange?: (userId: string | null) => void;
  readonly?: boolean;
}

export function UserCell({ value, users, onChange, readonly = false }: UserCellProps) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find((u) => u.id === value);

  if (readonly || !onChange) {
    if (!selectedUser) return <span className="text-muted-foreground">-</span>;

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={selectedUser.avatar_url} />
          <AvatarFallback>
            {selectedUser.full_name?.[0] || selectedUser.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{selectedUser.full_name || selectedUser.email}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded">
          {selectedUser ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar_url} />
                <AvatarFallback>
                  {selectedUser.full_name?.[0] || selectedUser.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{selectedUser.full_name || selectedUser.email}</span>
            </>
          ) : (
            <>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Select user...</span>
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search user..." />
          <CommandEmpty>No user found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {users.map((user) => (
              <CommandItem
                key={user.id}
                onSelect={() => {
                  onChange(user.id === value ? null : user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === user.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.full_name?.[0] || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.full_name || user.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
