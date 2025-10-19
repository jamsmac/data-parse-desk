import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, ExternalLink, X, ZoomIn, Grid3x3, LayoutGrid } from 'lucide-react';

interface GalleryViewProps {
  data: any[];
  imageColumn: string;
  titleColumn?: string;
  descriptionColumn?: string;
  categoryColumn?: string;
  onItemClick?: (item: any) => void;
}

export function GalleryView({
  data,
  imageColumn,
  titleColumn = 'title',
  descriptionColumn = 'description',
  categoryColumn,
  onItemClick,
}: GalleryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Фильтрация данных
  const filteredData = data.filter(item => {
    const matchesSearch = !searchQuery || 
      item[titleColumn]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item[descriptionColumn]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      (categoryColumn && item[categoryColumn] === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Получаем уникальные категории
  const categories = categoryColumn 
    ? Array.from(new Set(data.map(item => item[categoryColumn]).filter(Boolean)))
    : [];

  const getGridClass = () => {
    const sizes = {
      small: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
      medium: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
      large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    };
    return sizes[gridSize];
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={gridSize === 'small' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setGridSize('small')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={gridSize === 'medium' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setGridSize('medium')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={gridSize === 'large' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setGridSize('large')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Все ({data.length})
          </Badge>
          {categories.map(category => {
            const count = data.filter(item => item[categoryColumn] === category).length;
            return (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Gallery Grid */}
      <div className={`grid ${getGridClass()} gap-4`}>
        {filteredData.map((item, idx) => (
          <Card
            key={idx}
            className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setSelectedItem(item)}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {item[imageColumn] ? (
                <img
                  src={item[imageColumn]}
                  alt={item[titleColumn] || 'Image'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Нет изображения
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {item[imageColumn] && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item[imageColumn], item[titleColumn] || 'image');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {gridSize !== 'small' && (
              <CardContent className="p-4">
                <h4 className="font-medium truncate mb-1">
                  {item[titleColumn] || 'Без названия'}
                </h4>
                {item[descriptionColumn] && gridSize === 'large' && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item[descriptionColumn]}
                  </p>
                )}
                {categoryColumn && item[categoryColumn] && (
                  <Badge variant="secondary" className="mt-2">
                    {item[categoryColumn]}
                  </Badge>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* No results */}
      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ничего не найдено</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.[titleColumn] || 'Детали'}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem[imageColumn] && (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <img
                    src={selectedItem[imageColumn]}
                    alt={selectedItem[titleColumn] || 'Image'}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              {selectedItem[descriptionColumn] && (
                <p className="text-muted-foreground">
                  {selectedItem[descriptionColumn]}
                </p>
              )}
              <div className="flex gap-2">
                {selectedItem[imageColumn] && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(
                        selectedItem[imageColumn],
                        selectedItem[titleColumn] || 'image'
                      )}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedItem[imageColumn], '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть
                    </Button>
                  </>
                )}
                {onItemClick && (
                  <Button onClick={() => {
                    onItemClick(selectedItem);
                    setSelectedItem(null);
                  }}>
                    Редактировать
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Показано {filteredData.length} из {data.length} элементов</span>
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Сбросить фильтр
          </Button>
        )}
      </div>
    </div>
  );
}
