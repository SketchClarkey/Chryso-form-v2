import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { promises as fs } from 'fs';
import path from 'path';
import { IReport } from '../models/Report';

// Register Chart.js components for server-side rendering
Chart.register(...registerables);

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'png';
  includeCharts?: boolean;
  includeData?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
}

export class ExportService {
  private static instance: ExportService;
  private exportDir: string;

  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  async exportReport(
    report: IReport,
    data: any,
    options: ExportOptions,
    userId: string
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedReportName = report.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const fileName = `${sanitizedReportName}_${timestamp}.${options.format === 'excel' ? 'xlsx' : options.format}`;
    const filePath = path.join(this.exportDir, fileName);

    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(report, data, filePath, options);
        break;
      case 'excel':
        await this.exportToExcel(report, data, filePath, options);
        break;
      case 'csv':
        await this.exportToCSV(report, data, filePath, options);
        break;
      case 'png':
        await this.exportToPNG(report, data, filePath, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Log export activity
    console.log(`Report exported: ${fileName} by user ${userId}`);

    return { filePath, fileName };
  }

  private async exportToPDF(
    report: IReport,
    data: any,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const doc = new PDFDocument({
      size: options.pageSize || 'A4',
      layout: options.orientation || 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const writeStream = require('fs').createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).text(report.name, { align: 'center' });
    doc.moveDown();

    if (report.description) {
      doc.fontSize(12).text(report.description, { align: 'left' });
      doc.moveDown();
    }

    // Report metadata
    doc
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' })
      .text(`Version: ${report.version}`, { align: 'right' })
      .text(`Category: ${report.category}`, { align: 'right' });
    doc.moveDown();

    // Process visualizations
    for (const visualization of report.visualizations) {
      const vizData = data[visualization.dataSource] || [];

      doc.addPage();
      doc.fontSize(16).text(visualization.title || `${visualization.type} Visualization`);
      doc.moveDown();

      if (visualization.description) {
        doc.fontSize(10).text(visualization.description);
        doc.moveDown();
      }

      switch (visualization.type) {
        case 'table':
          await this.addTableToPDF(doc, vizData, visualization);
          break;
        case 'chart':
          if (options.includeCharts) {
            await this.addChartToPDF(doc, vizData, visualization);
          }
          break;
        case 'metric':
          await this.addMetricToPDF(doc, vizData, visualization);
          break;
        case 'text':
          await this.addTextToPDF(doc, visualization);
          break;
      }
    }

    // Summary data
    if (options.includeData) {
      doc.addPage();
      doc.fontSize(16).text('Data Summary');
      doc.moveDown();

      for (const [dataSourceId, sourceData] of Object.entries(data)) {
        doc
          .fontSize(14)
          .text(`${dataSourceId}: ${Array.isArray(sourceData) ? sourceData.length : 0} records`);
        doc.moveDown(0.5);
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  private async addTableToPDF(doc: any, data: any[], visualization: any): Promise<void> {
    if (!data || data.length === 0) {
      doc.text('No data available');
      return;
    }

    const columns = visualization.config?.columns || [];
    const keys = columns.length > 0 ? columns.map((col: any) => col.field) : Object.keys(data[0]);
    const headers = columns.length > 0 ? columns.map((col: any) => col.header || col.field) : keys;

    // Table headers
    doc.fontSize(10);
    const startX = doc.x;
    const columnWidth = (doc.page.width - 100) / headers.length;

    // Headers
    headers.forEach((header: string, index: number) => {
      doc.text(header, startX + index * columnWidth, doc.y, {
        width: columnWidth,
        align: 'left',
      });
    });
    doc.moveDown();

    // Data rows (limit to first 50 rows for PDF)
    const limitedData = data.slice(0, 50);
    limitedData.forEach((row: any) => {
      const rowY = doc.y;
      keys.forEach((key: string, index: number) => {
        const value =
          typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] || '');
        doc.text(value.substring(0, 50), startX + index * columnWidth, rowY, {
          width: columnWidth,
          align: 'left',
        });
      });
      doc.moveDown(0.5);
    });

    if (data.length > 50) {
      doc.moveDown();
      doc.text(`... and ${data.length - 50} more rows`, { align: 'center' });
    }
  }

  private async addChartToPDF(doc: any, data: any[], visualization: any): Promise<void> {
    try {
      const chartBuffer = await this.generateChartImage(data, visualization);
      doc.image(chartBuffer, { fit: [400, 300] });
    } catch (error) {
      console.error('Failed to generate chart for PDF:', error);
      doc.text('Chart could not be generated');
    }
  }

  private async addMetricToPDF(doc: any, data: any, visualization: any): Promise<void> {
    const value = data?.value || data?.count || 0;
    const format = visualization.config?.format || '';
    const prefix = visualization.config?.prefix || '';
    const suffix = visualization.config?.suffix || '';

    let displayValue = value;
    if (format === 'percentage') {
      displayValue = `${(value * 100).toFixed(1)}%`;
    } else if (format === 'currency') {
      displayValue = `$${value.toLocaleString()}`;
    } else {
      displayValue = value.toLocaleString();
    }

    doc.fontSize(24).text(`${prefix}${displayValue}${suffix}`, { align: 'center' });
    doc.moveDown();
  }

  private async addTextToPDF(doc: any, visualization: any): Promise<void> {
    const content = visualization.config?.content || '';
    const cleanContent = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
    doc.fontSize(11).text(cleanContent);
    doc.moveDown();
  }

  private async exportToExcel(
    report: IReport,
    data: any,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Report Name', report.name],
      ['Description', report.description || ''],
      ['Category', report.category],
      ['Version', report.version.toString()],
      ['Generated', new Date().toISOString()],
      [''],
      ['Data Sources Summary'],
    ];

    for (const [dataSourceId, sourceData] of Object.entries(data)) {
      summaryData.push([
        dataSourceId,
        Array.isArray(sourceData) ? sourceData.length.toString() : '0',
      ]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Data sheets for each data source
    for (const [dataSourceId, sourceData] of Object.entries(data)) {
      if (Array.isArray(sourceData) && sourceData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sourceData);
        XLSX.utils.book_append_sheet(workbook, worksheet, dataSourceId.substring(0, 31)); // Excel sheet name limit
      }
    }

    // Visualization sheets
    for (const visualization of report.visualizations) {
      const vizData = data[visualization.dataSource] || [];

      if (visualization.type === 'table' && Array.isArray(vizData) && vizData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(vizData);
        const sheetName = (visualization.title || visualization.type).substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    }

    XLSX.writeFile(workbook, filePath);
  }

  private async exportToCSV(
    report: IReport,
    data: any,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    let csvContent = '';

    // Header
    csvContent += `"Report: ${report.name}"\n`;
    csvContent += `"Generated: ${new Date().toISOString()}"\n`;
    csvContent += `"Version: ${report.version}"\n\n`;

    // Export each data source
    for (const [dataSourceId, sourceData] of Object.entries(data)) {
      if (Array.isArray(sourceData) && sourceData.length > 0) {
        csvContent += `"Data Source: ${dataSourceId}"\n`;

        // Headers
        const headers = Object.keys(sourceData[0]);
        csvContent += `${headers.map(header => `"${header}"`).join(',')}\n`;

        // Data rows
        sourceData.forEach((row: any) => {
          const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          });
          csvContent += `${values.join(',')}\n`;
        });

        csvContent += '\n';
      }
    }

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  private async exportToPNG(
    report: IReport,
    data: any,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    // For PNG export, we'll create a composite image of all visualizations
    const canvas = createCanvas(1200, 800);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = report.layout?.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(report.name, canvas.width / 2, 50);

    let yOffset = 100;

    // Generate charts for each visualization
    for (const visualization of report.visualizations) {
      const vizData = data[visualization.dataSource] || [];

      if (visualization.type === 'chart' && vizData.length > 0) {
        try {
          const chartBuffer = await this.generateChartImage(vizData, visualization);
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img as any, 50, yOffset, 400, 250);
          };
          img.src = `data:image/png;base64,${chartBuffer.toString('base64')}`;
          yOffset += 300;
        } catch (error) {
          console.error('Failed to generate chart for PNG:', error);
        }
      }
    }

    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filePath, buffer);
  }

  private async generateChartImage(data: any[], visualization: any): Promise<Buffer> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    const chartData = {
      labels: data.map((item: any) => item.label || item.name || 'Unknown'),
      datasets: [
        {
          label: visualization.title || 'Dataset',
          data: data.map((item: any) => item.value || item.count || 0),
          backgroundColor: [
            '#3f51b5',
            '#f50057',
            '#ff9800',
            '#4caf50',
            '#2196f3',
            '#9c27b0',
            '#607d8b',
            '#795548',
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };

    const config: ChartConfiguration = {
      type: visualization.config?.chartType || 'bar',
      data: chartData,
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: !!visualization.title,
            text: visualization.title,
          },
        },
      },
    };

    const chart = new Chart(ctx as any, config);
    chart.render();

    return canvas.toBuffer('image/png');
  }

  async cleanupOldExports(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.exportDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          await fs.unlink(filePath);
          console.log(`Deleted old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }
}

export default ExportService;
