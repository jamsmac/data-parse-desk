import { usePresence } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil } from 'lucide-react';

interface CellEditIndicatorProps {
  databaseId: string;
  rowId: string;
  column: string;
  projectId?: string;
}

// Same color generation as CollaborativeCursors
const getUserColor = (userId: string): string => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export function CellEditIndicator({
  databaseId,
  rowId,
  column,
  projectId,
}: CellEditIndicatorProps) {
  const { getUsersEditingCell } = usePresence({
    projectId,
    databaseId,
  });

  const editingUsers = getUsersEditingCell(column, rowId);

  if (editingUsers.length === 0) return null;

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-0 right-0 z-10"
        initial={{ opacity: 0, scale: 0.5, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="flex items-center gap-1 -mt-2 -mr-2">
          {editingUsers.map((user) => {
            const color = getUserColor(user.user_id);

            return (
              <Tooltip key={user.id}>
                <TooltipTrigger>
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {/* Editing indicator badge */}
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      <Pencil className="h-3 w-3 text-white" />
                      <Avatar className="h-5 w-5 border border-white">
                        <AvatarImage src={user.user_avatar || undefined} alt={user.user_name} />
                        <AvatarFallback
                          className="text-[10px]"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(user.user_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Pulsing ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: color, opacity: 0.3 }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm font-medium">{user.user_name}</p>
                  <p className="text-xs text-muted-foreground">редактирует эту ячейку</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
