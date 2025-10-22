/**
 * Report Generator Dialog
 * Create and export HTML/PDF reports from table data
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  Printer,
  Eye,
  Loader2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateHTMLReport,
  downloadHTMLReport,
  printHTMLReport,
  ReportData,
  ReportTemplate,
  DEFAULT_TEMPLATE,
} from '@/utils/reportGenerator';

interface ReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  data: ReportData;
}

export function ReportGenerator({ open, onClose, data }: ReportGeneratorProps) {
  const [template, setTemplate] = useState<ReportTemplate>(DEFAULT_TEMPLATE);
  const [reportTitle, setReportTitle] = useState(data.title);
  const [reportDescription, setReportDescription] = useState(
    data.description || ''
  );
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGeneratePreview = () => {
    setGenerating(true);

    setTimeout(() => {
      const html = generateHTMLReport(
        {
          ...data,
          title: reportTitle,
          description: reportDescription,
        },
        template
      );
      setPreviewHtml(html);
      setGenerating(false);
    }, 300);
  };

  const handleDownload = () => {
    const html = generateHTMLReport(
      {
        ...data,
        title: reportTitle,
        description: reportDescription,
      },
      template
    );

    const filename = `${reportTitle
      .toLowerCase()
      .replace(/\s+/g, '-')}-${new Date().getTime()}`;

    downloadHTMLReport(html, filename);
    toast.success('Report downloaded successfully');
  };

  const handlePrint = () => {
    const html = generateHTMLReport(
      {
        ...data,
        title: reportTitle,
        description: reportDescription,
      },
      template
    );

    printHTMLReport(html);
  };

  const updateTemplate = (updates: Partial<ReportTemplate>) => {
    setTemplate({ ...template, ...updates });
    setPreviewHtml(null); // Reset preview when template changes
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Generator
          </DialogTitle>
          <DialogDescription>
            Create professional HTML reports from your data
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="configure" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configure">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Configure Tab */}
          <TabsContent value="configure" className="space-y-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Report Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Report Information</h3>
                  <div>
                    <Label htmlFor="report-title">Title</Label>
                    <Input
                      id="report-title"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Enter report title"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-description">Description</Label>
                    <Textarea
                      id="report-description"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Enter report description"
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Layout */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Layout</h3>
                  <div>
                    <Label htmlFor="layout">Page Orientation</Label>
                    <Select
                      value={template.layout}
                      onValueChange={(value: any) =>
                        updateTemplate({ layout: value })
                      }
                    >
                      <SelectTrigger id="layout" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="font-size">Font Size</Label>
                    <Select
                      value={template.fontSize}
                      onValueChange={(value: any) =>
                        updateTemplate({ fontSize: value })
                      }
                    >
                      <SelectTrigger id="font-size" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="color-scheme">Color Scheme</Label>
                    <Select
                      value={template.colorScheme}
                      onValueChange={(value: any) =>
                        updateTemplate({ colorScheme: value })
                      }
                    >
                      <SelectTrigger id="color-scheme" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (Blue)</SelectItem>
                        <SelectItem value="blue">Sky Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Components */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Components</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-header"
                        checked={template.showHeader}
                        onCheckedChange={(checked) =>
                          updateTemplate({ showHeader: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor="show-header"
                        className="font-normal cursor-pointer"
                      >
                        Show header with title and metadata
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-summary"
                        checked={template.showSummary}
                        onCheckedChange={(checked) =>
                          updateTemplate({ showSummary: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor="show-summary"
                        className="font-normal cursor-pointer"
                      >
                        Show summary statistics
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-charts"
                        checked={template.showCharts}
                        onCheckedChange={(checked) =>
                          updateTemplate({ showCharts: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor="show-charts"
                        className="font-normal cursor-pointer"
                      >
                        Show charts and visualizations
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-footer"
                        checked={template.showFooter}
                        onCheckedChange={(checked) =>
                          updateTemplate({ showFooter: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor="show-footer"
                        className="font-normal cursor-pointer"
                      >
                        Show footer with generation timestamp
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Data Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Data Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Records:</span>
                      <span className="font-semibold">{data.data.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Columns:</span>
                      <span className="font-semibold">
                        {data.columns.length}
                      </span>
                    </div>
                    {data.filters && data.filters.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Filters:</span>
                        <span className="font-semibold">
                          {data.filters.length}
                        </span>
                      </div>
                    )}
                    {data.summary && data.summary.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Summary Stats:
                        </span>
                        <span className="font-semibold">
                          {data.summary.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {!previewHtml ? (
              <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click "Generate Preview" to see your report
                </p>
                <Button onClick={handleGeneratePreview} disabled={generating}>
                  {generating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Preview
                </Button>
              </div>
            ) : (
              <div>
                <div className="border rounded-lg overflow-hidden h-[500px]">
                  <iframe
                    srcDoc={previewHtml}
                    title="Report Preview"
                    className="w-full h-full border-0"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                  >
                    {generating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download HTML
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
