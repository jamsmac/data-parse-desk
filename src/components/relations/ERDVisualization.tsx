import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  columns: Array<{
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
  }>;
}

interface Relation {
  id: string;
  source_database_id: string;
  target_database_id: string;
  relation_type: string;
  source_column: string;
  target_column: string;
}

interface ERDVisualizationProps {
  tables: Table[];
  relations: Relation[];
}

export function ERDVisualization({ tables, relations }: ERDVisualizationProps) {
  const layout = useMemo(() => {
    const cols = 3;
    return tables.map((table, idx) => ({
      ...table,
      x: (idx % cols) * 350 + 50,
      y: Math.floor(idx / cols) * 300 + 50
    }));
  }, [tables]);

  const relationPaths = useMemo(() => {
    return relations.map(rel => {
      const source = layout.find(t => t.id === rel.source_database_id);
      const target = layout.find(t => t.id === rel.target_database_id);

      if (!source || !target) return null;

      const x1 = source.x + 150;
      const y1 = source.y + 100;
      const x2 = target.x + 150;
      const y2 = target.y + 100;

      return {
        ...rel,
        path: `M ${x1} ${y1} L ${x2} ${y2}`,
        midX: (x1 + x2) / 2,
        midY: (y1 + y2) / 2
      };
    }).filter(Boolean);
  }, [layout, relations]);

  const height = Math.max(...layout.map(t => t.y)) + 250;

  return (
    <div className="relative w-full overflow-x-auto border rounded-lg bg-muted/20">
      <svg 
        width="100%" 
        height={height}
        className="absolute top-0 left-0"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon 
              points="0 0, 10 3, 0 6" 
              fill="currentColor" 
              className="text-primary"
            />
          </marker>
        </defs>

        {relationPaths.map((rel: any, idx) => (
          <g key={idx}>
            <path
              d={rel.path}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
              className="text-primary"
            />
            <text
              x={rel.midX}
              y={rel.midY - 10}
              textAnchor="middle"
              className="text-xs fill-current"
            >
              {rel.relation_type}
            </text>
          </g>
        ))}
      </svg>

      <div className="relative" style={{ height }}>
        {layout.map(table => (
          <Card
            key={table.id}
            className="absolute w-72 shadow-lg"
            style={{ left: table.x, top: table.y }}
          >
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                {table.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-1">
              {table.columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/50"
                >
                  <span className={col.isPrimary ? 'font-semibold' : ''}>
                    {col.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {col.type}
                    </Badge>
                    {col.isPrimary && (
                      <Badge className="text-xs bg-primary">PK</Badge>
                    )}
                    {col.isForeign && (
                      <Badge className="text-xs bg-secondary">FK</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
