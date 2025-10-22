import { usePresence } from '@/hooks/usePresence';
import { motion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

interface CollaborativeCursorsProps {
  projectId?: string;
  databaseId: string;
  containerRef: React.RefObject<HTMLElement>;
}

// Generate consistent color for each user
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

  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export function CollaborativeCursors({
  projectId,
  databaseId,
  containerRef,
}: CollaborativeCursorsProps) {
  const { activeUsers } = usePresence({ projectId, databaseId });

  // Only show users with cursor positions
  const usersWithCursors = activeUsers.filter(
    (user) =>
      user.cursor_x !== null &&
      user.cursor_y !== null &&
      user.status === 'active'
  );

  if (usersWithCursors.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {usersWithCursors.map((user) => {
        const color = getUserColor(user.user_id);
        const x = user.cursor_x || 0;
        const y = user.cursor_y || 0;

        return (
          <motion.div
            key={user.id}
            className="absolute"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: 1,
              x,
              y,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            style={{
              left: 0,
              top: 0,
            }}
          >
            {/* Cursor icon */}
            <MousePointer2
              className="h-5 w-5 -rotate-90"
              style={{ color }}
              fill={color}
            />

            {/* User label */}
            <motion.div
              className="absolute top-6 left-0 whitespace-nowrap px-2 py-1 rounded text-xs font-medium text-white shadow-lg"
              style={{ backgroundColor: color }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {user.user_name}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
