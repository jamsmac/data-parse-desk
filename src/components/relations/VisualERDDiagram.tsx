import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface VisualERDDiagramProps {
  projectId: string;
}

interface Database {
  id: string;
  name: string;
  description?: string;
}

interface TableSchema {
  id: string;
  database_id: string;
  column_name: string;
  column_type: string;
  is_required: boolean;
  position: number;
}

interface Relation {
  id: string;
  source_database_id: string;
  target_database_id: string;
  relation_type: string;
  source_column: string;
  target_column: string;
}

interface EntityNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: TableSchema[];
}

export function VisualERDDiagram({ projectId }: VisualERDDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load databases
  const { data: databases } = useQuery({
    queryKey: ['databases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('databases')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      
      if (error) throw error;
      return data as Database[];
    },
  });

  // Load schemas
  const { data: schemas } = useQuery({
    queryKey: ['table-schemas', projectId],
    queryFn: async () => {
      if (!databases) return [];
      
      const databaseIds = databases.map(db => db.id);
      const { data, error } = await supabase
        .from('table_schemas')
        .select('*')
        .in('database_id', databaseIds)
        .order('position');
      
      if (error) throw error;
      return data as TableSchema[];
    },
    enabled: !!databases,
  });

  // Load relations
  const { data: relations } = useQuery({
    queryKey: ['relations', projectId],
    queryFn: async () => {
      if (!databases) return [];
      
      const databaseIds = databases.map(db => db.id);
      const { data, error } = await supabase
        .from('database_relations')
        .select('*')
        .in('source_database_id', databaseIds);
      
      if (error) throw error;
      return data as Relation[];
    },
    enabled: !!databases,
  });

  // Calculate entity positions in a circular layout
  const calculateEntityNodes = (): EntityNode[] => {
    if (!databases || !schemas) return [];

    const nodes: EntityNode[] = [];
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    const angleStep = (2 * Math.PI) / databases.length;

    databases.forEach((db, index) => {
      const angle = index * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const dbSchemas = schemas.filter(s => s.database_id === db.id);
      const height = Math.max(100, 40 + dbSchemas.length * 25);

      nodes.push({
        id: db.id,
        name: db.name,
        x: x - 100,
        y: y - height / 2,
        width: 200,
        height,
        columns: dbSchemas,
      });
    });

    return nodes;
  };

  // Draw ERD
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !databases || !schemas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const nodes = calculateEntityNodes();

    // Draw relationships first (behind entities)
    if (relations) {
      relations.forEach(rel => {
        const source = nodes.find(n => n.id === rel.source_database_id);
        const target = nodes.find(n => n.id === rel.target_database_id);
        
        if (source && target) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          // Calculate connection points
          const sourceX = source.x + source.width;
          const sourceY = source.y + source.height / 2;
          const targetX = target.x;
          const targetY = target.y + target.height / 2;
          
          ctx.moveTo(sourceX, sourceY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();

          // Draw relationship type label
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;
          
          ctx.fillStyle = '#64748b';
          ctx.font = '12px sans-serif';
          ctx.fillText(rel.relation_type, midX, midY - 5);

          // Draw arrow
          const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
          const arrowSize = 10;
          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(
            targetX - arrowSize * Math.cos(angle - Math.PI / 6),
            targetY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            targetX - arrowSize * Math.cos(angle + Math.PI / 6),
            targetY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
        }
      });
    }

    // Draw entities
    nodes.forEach(node => {
      // Entity box
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.fillRect(node.x, node.y, node.width, node.height);
      ctx.strokeRect(node.x, node.y, node.width, node.height);

      // Entity header
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(node.x, node.y, node.width, 35);
      ctx.strokeRect(node.x, node.y, node.width, 35);

      // Entity name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(node.name, node.x + 10, node.y + 22);

      // Columns
      ctx.font = '12px monospace';
      node.columns.slice(0, 10).forEach((col, i) => {
        const yPos = node.y + 45 + i * 25;
        
        // Column name
        ctx.fillStyle = '#334155';
        ctx.fillText(col.column_name, node.x + 10, yPos);
        
        // Column type
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText(col.column_type, node.x + 110, yPos);
        
        // Required indicator
        if (col.is_required) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('*', node.x + 5, yPos);
        }
        
        ctx.font = '12px monospace';
      });

      // Show "..." if more columns
      if (node.columns.length > 10) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          `... +${node.columns.length - 10} more`,
          node.x + 10,
          node.y + 45 + 10 * 25
        );
      }
    });

    ctx.restore();
  }, [databases, schemas, relations, zoom, pan]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'erd-diagram.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!databases || databases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ERD Diagram</CardTitle>
          <CardDescription>Visual Entity-Relationship Diagram</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No databases in this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ERD Diagram</CardTitle>
            <CardDescription>
              Entity-Relationship Diagram for {databases.length} database{databases.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{relations?.length || 0} relations</Badge>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleReset}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-muted/30">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>•</span>
          <span>Drag to pan</span>
          <span>•</span>
          <span className="text-red-500">*</span> = Required field
        </div>
      </CardContent>
    </Card>
  );
}
