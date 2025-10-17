import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database as DatabaseIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRight,
  GitBranch,
  Download,
  FileImage,
  FileCode
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Database, DatabaseRelation } from '@/types/database';

interface RelationshipGraphProps {
  databases: Database[];
  relations: DatabaseRelation[];
  onDatabaseClick?: (database: Database) => void;
  onRelationClick?: (relation: DatabaseRelation) => void;
}

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'one_to_many' | 'many_to_one' | 'many_to_many';
}

export default function RelationshipGraph({
  databases,
  relations,
  onDatabaseClick,
  onRelationClick,
}: RelationshipGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Преобразуем данные в граф
  const graphData = {
    nodes: databases.map((db, index) => ({
      id: db.id,
      name: db.name,
      x: 0,
      y: 0,
      color: db.color || '#3b82f6',
    })),
    edges: relations.map((rel) => ({
      id: rel.id,
      source: rel.source_database_id,
      target: rel.target_database_id,
      type: rel.relation_type,
    })),
  };

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Применяем трансформацию
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Рисуем рёбра
    graphData.edges.forEach((edge) => {
      const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
      const targetNode = graphData.nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Рисуем стрелку
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
      const arrowSize = 10;
      const arrowX = targetNode.x - 40 * Math.cos(angle);
      const arrowY = targetNode.y - 40 * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      // Метка типа связи
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const typeLabel = edge.type === 'one_to_many' ? '1:N' :
                       edge.type === 'many_to_one' ? 'N:1' : 'N:N';
      ctx.fillText(typeLabel, midX, midY - 10);
    });

    // Рисуем узлы
    graphData.nodes.forEach((node) => {
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;
      const nodeRadius = 35;

      // Подсветка при наведении/выборе
      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.1)';
        ctx.fill();
      }

      // Узел
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#cbd5e1';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Иконка базы данных (упрощённая)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DB', node.x, node.y);

      // Название
      ctx.fillStyle = '#0f172a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name,
        node.x,
        node.y + nodeRadius + 10
      );
    });

    ctx.restore();
  }, [graphData.nodes, graphData.edges, offset.x, offset.y, zoom, hoveredNode, selectedNode]);

  // Расчёт позиций узлов (круговая раскладка)
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Позиционируем узлы по кругу
    graphData.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / graphData.nodes.length - Math.PI / 2;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    drawGraph();
  }, [databases, relations, zoom, offset, hoveredNode, selectedNode, drawGraph, graphData.nodes]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    // Проверяем клик по узлу
    const clickedNode = graphData.nodes.find((node) => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance < 35;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      const database = databases.find((db) => db.id === clickedNode.id);
      if (database && onDatabaseClick) {
        onDatabaseClick(database);
      }
    } else {
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    // Проверяем наведение на узел
    const hoveredNode = graphData.nodes.find((node) => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance < 35;
    });

    setHoveredNode(hoveredNode ? hoveredNode.id : null);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Экспорт графа в PNG
  const exportGraphAsPNG = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      // Добавляем водяной знак и дату
      const watermarkDiv = document.createElement('div');
      watermarkDiv.style.position = 'absolute';
      watermarkDiv.style.bottom = '10px';
      watermarkDiv.style.right = '10px';
      watermarkDiv.style.fontSize = '12px';
      watermarkDiv.style.color = '#666';
      watermarkDiv.style.backgroundColor = 'rgba(255,255,255,0.8)';
      watermarkDiv.style.padding = '4px 8px';
      watermarkDiv.style.borderRadius = '4px';
      watermarkDiv.innerHTML = `VHData Platform • ${new Date().toLocaleDateString('ru-RU')}`;
      container.appendChild(watermarkDiv);

      const canvas = await html2canvas(container, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        logging: false,
      });

      // Удаляем водяной знак после создания скриншота
      container.removeChild(watermarkDiv);

      // Конвертируем в blob и скачиваем
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `relationship-graph-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting graph as PNG:', error);
    }
  };

  // Экспорт графа в SVG (конвертация Canvas в SVG)
  const exportGraphAsSVG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Создаем SVG элемент
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(canvas.width));
    svg.setAttribute('height', String(canvas.height));
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Добавляем фон
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', '#1a1a2e');
    svg.appendChild(rect);

    // Группа для трансформаций
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${offset.x},${offset.y}) scale(${zoom})`);

    // Добавляем рёбра
    graphData.edges.forEach((edge) => {
      const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
      const targetNode = graphData.nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(sourceNode.x));
      line.setAttribute('y1', String(sourceNode.y));
      line.setAttribute('x2', String(targetNode.x));
      line.setAttribute('y2', String(targetNode.y));
      line.setAttribute('stroke', '#94a3b8');
      line.setAttribute('stroke-width', '2');
      g.appendChild(line);

      // Добавляем стрелку
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
      const arrowSize = 10;
      const endX = targetNode.x - Math.cos(angle) * 35;
      const endY = targetNode.y - Math.sin(angle) * 35;

      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const points = [
        [endX, endY],
        [endX - Math.cos(angle - Math.PI / 6) * arrowSize, endY - Math.sin(angle - Math.PI / 6) * arrowSize],
        [endX - Math.cos(angle + Math.PI / 6) * arrowSize, endY - Math.sin(angle + Math.PI / 6) * arrowSize],
      ];
      arrow.setAttribute('points', points.map(p => p.join(',')).join(' '));
      arrow.setAttribute('fill', '#94a3b8');
      g.appendChild(arrow);
    });

    // Добавляем узлы
    graphData.nodes.forEach((node) => {
      // Круг узла
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x));
      circle.setAttribute('cy', String(node.y));
      circle.setAttribute('r', '30');
      circle.setAttribute('fill', node.color);
      circle.setAttribute('stroke', selectedNode === node.id ? '#fff' : 'transparent');
      circle.setAttribute('stroke-width', '3');
      g.appendChild(circle);

      // Иконка базы данных
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', String(node.x));
      icon.setAttribute('y', String(node.y + 5));
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('fill', '#fff');
      icon.setAttribute('font-size', '20');
      icon.innerHTML = '⛁';
      g.appendChild(icon);

      // Название узла
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(node.x));
      text.setAttribute('y', String(node.y + 50));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#e2e8f0');
      text.setAttribute('font-size', '12');
      text.textContent = node.name;
      g.appendChild(text);
    });

    svg.appendChild(g);

    // Добавляем водяной знак
    const watermark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    watermark.setAttribute('x', String(canvas.width - 10));
    watermark.setAttribute('y', String(canvas.height - 10));
    watermark.setAttribute('text-anchor', 'end');
    watermark.setAttribute('fill', '#666');
    watermark.setAttribute('font-size', '12');
    watermark.textContent = `VHData Platform • ${new Date().toLocaleDateString('ru-RU')}`;
    svg.appendChild(watermark);

    // Сериализуем и скачиваем
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `relationship-graph-${Date.now()}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const selectedDatabase = selectedNode
    ? databases.find((db) => db.id === selectedNode)
    : null;

  const selectedRelations = selectedNode
    ? relations.filter(
        (rel) => rel.source_database_id === selectedNode || rel.target_database_id === selectedNode
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Заголовок и управление */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Граф связей баз данных
          </h3>
          <p className="text-sm text-muted-foreground">
            {databases.length} баз данных, {relations.length} связей
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <Maximize2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={exportGraphAsPNG}
            className="gap-2"
          >
            <FileImage className="h-4 w-4" />
            <span className="hidden sm:inline">PNG</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportGraphAsSVG}
            className="gap-2"
          >
            <FileCode className="h-4 w-4" />
            <span className="hidden sm:inline">SVG</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Граф */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div id="relationship-graph" ref={containerRef} className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full border rounded-lg cursor-grab active:cursor-grabbing"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </CardContent>
        </Card>

        {/* Информация */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDatabase ? 'Детали базы данных' : 'Информация'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDatabase ? (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: selectedDatabase.color || '#3b82f6' }}
                  >
                    <DatabaseIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{selectedDatabase.name}</h4>
                    {selectedDatabase.description && (
                      <p className="text-xs text-muted-foreground">
                        {selectedDatabase.description}
                      </p>
                    )}
                  </div>
                </div>

                {selectedRelations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Связи ({selectedRelations.length})</h5>
                    <div className="space-y-2">
                      {selectedRelations.map((rel) => {
                        const isSource = rel.source_database_id === selectedNode;
                        const otherDbId = isSource
                          ? rel.target_database_id
                          : rel.source_database_id;
                        const otherDb = databases.find((db) => db.id === otherDbId);

                        return (
                          <div
                            key={rel.id}
                            className="p-2 border rounded-lg text-sm hover:bg-accent cursor-pointer"
                            onClick={() => onRelationClick?.(rel)}
                          >
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium">{otherDb?.name}</span>
                            </div>
                            <Badge variant="secondary" className="mt-1">
                              {rel.relation_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <DatabaseIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Выберите базу данных для просмотра деталей</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
