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
  GitBranch
} from 'lucide-react';
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Граф */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0" ref={containerRef}>
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
