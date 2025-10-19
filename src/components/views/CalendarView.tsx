import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CalendarViewProps {
  data: any[];
  dateColumn: string;
  titleColumn?: string;
  statusColumn?: string;
  onEventClick?: (event: any) => void;
  onAddEvent?: (date: Date) => void;
}

export function CalendarView({
  data,
  dateColumn,
  titleColumn = 'title',
  statusColumn,
  onEventClick,
  onAddEvent,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Группируем события по датам
  const eventsByDate = data.reduce((acc, item) => {
    if (!item[dateColumn]) return acc;
    
    try {
      const date = typeof item[dateColumn] === 'string' 
        ? parseISO(item[dateColumn]) 
        : new Date(item[dateColumn]);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
    } catch (error) {
      console.error('Invalid date:', item[dateColumn]);
    }
    
    return acc;
  }, {} as Record<string, any[]>);

  // События выбранной даты
  const selectedDateEvents = eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || [];

  // Даты с событиями для подсветки в календаре
  const datesWithEvents = Object.keys(eventsByDate).map(dateStr => parseISO(dateStr));

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'completed': 'bg-green-500',
      'in_progress': 'bg-blue-500',
      'pending': 'bg-yellow-500',
      'cancelled': 'bg-red-500',
    };
    return colors[status.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Календарь */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Календарь</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-normal">
                {format(selectedDate, 'LLLL yyyy', { locale: ru })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
            modifiers={{
              hasEvents: datesWithEvents,
            }}
            modifiersStyles={{
              hasEvents: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* События выбранной даты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>События {format(selectedDate, 'd MMMM', { locale: ru })}</span>
            {onAddEvent && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddEvent(selectedDate)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет событий на эту дату
              </p>
            ) : (
              selectedDateEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {event[titleColumn] || 'Без названия'}
                      </p>
                      {event[dateColumn] && (
                        <p className="text-xs text-muted-foreground">
                          {format(
                            typeof event[dateColumn] === 'string' 
                              ? parseISO(event[dateColumn]) 
                              : new Date(event[dateColumn]),
                            'HH:mm'
                          )}
                        </p>
                      )}
                    </div>
                    {statusColumn && event[statusColumn] && (
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(event[statusColumn])} text-white`}
                      >
                        {event[statusColumn]}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Статистика по месяцу</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{Object.keys(eventsByDate).length}</p>
              <p className="text-sm text-muted-foreground">Дней с событиями</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.length}</p>
              <p className="text-sm text-muted-foreground">Всего событий</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedDateEvents.length}</p>
              <p className="text-sm text-muted-foreground">События сегодня</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Math.round(data.length / Object.keys(eventsByDate).length) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Среднее в день</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
