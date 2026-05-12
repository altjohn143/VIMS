const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Report Generation Service
 * Generates professional PDF reports for various system data
 */

class PDFReportService {
  constructor() {
    this.fonts = {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique'
    };
  }

  /**
   * Generate AI Financial Report PDF
   */
  async generateFinancialReport(data, options = {}) {
    const generatedAt = new Date();
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: 'VIMS Financial Report',
            Author: options.creator ? `${options.creator.firstName} ${options.creator.lastName}` : 'VIMS System',
            Subject: 'Financial Analysis Report'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        this._addReportHeader(doc, 'VIMS Financial Report', data.period, data.year, data.month, options.creator, generatedAt);
        this._addFinancialSummary(doc, data.summary);
        this._addFinancialAnalysis(doc, data.report);
        this._addReportFooter(doc, options.creator, generatedAt);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate AI Visitor Security Report PDF
   */
  async generateVisitorReport(data, options = {}) {
    const generatedAt = new Date();
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: 'VIMS Visitor Security Report',
            Author: options.creator ? `${options.creator.firstName} ${options.creator.lastName}` : 'VIMS System',
            Subject: 'Visitor Security Analysis Report'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        this._addReportHeader(doc, 'VIMS Visitor Security Report', data.period, data.date, null, options.creator, generatedAt);
        this._addVisitorSummary(doc, data.summary);
        this._addVisitorAnalysis(doc, data.report);
        this._addReportFooter(doc, options.creator, generatedAt);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate AI Incident Report PDF
   */
  async generateIncidentReport(data, options = {}) {
    const generatedAt = new Date();
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: 'VIMS Incident Analysis Report',
            Author: options.creator ? `${options.creator.firstName} ${options.creator.lastName}` : 'VIMS System',
            Subject: 'Incident Analysis Report'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        this._addReportHeader(doc, 'VIMS Incident Analysis Report', data.period, data.date, null, options.creator, generatedAt);
        this._addIncidentSummary(doc, data.summary);
        this._addIncidentAnalysis(doc, data.report);
        this._addReportFooter(doc, options.creator, generatedAt);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate General Data Report PDF (for non-AI reports)
   */
  async generateDataReport(title, data, columns, options = {}) {
    const generatedAt = new Date();
    return new Promise((resolve, reject) => {
      try {
        console.log(`Generating PDF report: ${title}, ${data.length} rows, ${columns.length} columns`);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: title,
            Author: options.creator ? `${options.creator.firstName} ${options.creator.lastName}` : 'VIMS System',
            Subject: `${title} Report`
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`PDF generation completed, buffer size: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          console.error('PDF generation error:', error);
          reject(error);
        });

        this._addReportHeader(doc, title, 'Generated', generatedAt.toLocaleDateString(), null, options.creator, generatedAt);
        this._addDataTable(doc, data, columns);
        this._addReportFooter(doc, options.creator, generatedAt);

        doc.end();
      } catch (error) {
        console.error('PDF generation failed:', error);
        reject(error);
      }
    });
  }

  _addReportHeader(doc, title, period, date, month, creator, generatedAt = new Date()) {
    // Header with logo placeholder
    doc.fontSize(20).font(this.fonts.bold).text('VIMS - Village Integrated Management System', 0, 50, { align: 'center' });

    // Title
    doc.moveDown(2);
    doc.fontSize(16).font(this.fonts.bold).text(title, { align: 'center' });

    // Period/Date info
    doc.moveDown(1);
    doc.fontSize(12).font(this.fonts.normal);
    if (period && date) {
      doc.text(`${period}: ${date}${month ? `/${month}` : ''}`, { align: 'center' });
    }
    doc.text(`Generated on: ${generatedAt.toLocaleString()}`, { align: 'center' });

    // Creator info
    if (creator) {
      doc.moveDown(0.5);
      doc.fontSize(10).font(this.fonts.normal).text(
        `Generated by: ${creator.firstName} ${creator.lastName} (${creator.role})`,
        { align: 'center' }
      );
    }

    // Separator line
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);
  }

  _addFinancialSummary(doc, summary) {
    doc.fontSize(14).font(this.fonts.bold).text('Financial Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).font(this.fonts.normal);
    doc.text(`Total Revenue: ₱${summary.totalRevenue.toLocaleString()}`);
    doc.text(`Number of Payments: ${summary.paymentCount}`);
    doc.text(`Total Residents: ${summary.totalUsers}`);
    doc.text(`New Residents: ${summary.newUsers}`);
    doc.text(`Average Payment: ₱${summary.paymentCount > 0 ? Math.round(summary.totalRevenue / summary.paymentCount).toLocaleString() : 0}`);

    doc.moveDown(1);
  }

  _addVisitorSummary(doc, summary) {
    doc.fontSize(14).font(this.fonts.bold).text('Visitor Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).font(this.fonts.normal);
    doc.text(`Total Visitors: ${summary.totalVisitors}`);
    doc.text(`Approved: ${summary.approvedVisitors}`);
    doc.text(`Pending: ${summary.pendingVisitors}`);
    doc.text(`Rejected: ${summary.rejectedVisitors}`);
    doc.text(`Approval Rate: ${summary.totalVisitors > 0 ? Math.round((summary.approvedVisitors / summary.totalVisitors) * 100) : 0}%`);

    doc.moveDown(1);
  }

  _addIncidentSummary(doc, summary) {
    doc.fontSize(14).font(this.fonts.bold).text('Incident Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).font(this.fonts.normal);
    doc.text(`Total Incidents: ${summary.totalIncidents}`);
    doc.text(`Resolved: ${summary.resolvedIncidents}`);
    doc.text(`Pending: ${summary.pendingIncidents}`);
    doc.text(`Urgent: ${summary.urgentIncidents}`);
    doc.text(`Resolution Rate: ${summary.totalIncidents > 0 ? Math.round((summary.resolvedIncidents / summary.totalIncidents) * 100) : 0}%`);

    doc.moveDown(1);
  }

  _addFinancialAnalysis(doc, analysis) {
    doc.fontSize(14).font(this.fonts.bold).text('AI Financial Analysis', { underline: true });
    doc.moveDown(0.5);
    this._addWrappedText(doc, analysis, 11);
  }

  _addVisitorAnalysis(doc, analysis) {
    doc.fontSize(14).font(this.fonts.bold).text('AI Visitor Security Analysis', { underline: true });
    doc.moveDown(0.5);
    this._addWrappedText(doc, analysis, 11);
  }

  _addIncidentAnalysis(doc, analysis) {
    doc.fontSize(14).font(this.fonts.bold).text('AI Incident Analysis', { underline: true });
    doc.moveDown(0.5);
    this._addWrappedText(doc, analysis, 11);
  }

  _addDataTable(doc, data, columns) {
    if (!data || data.length === 0) {
      doc.fontSize(11).text('No data available for this report.');
      return;
    }

    const tableTop = doc.y + 10;
    const totalWidth = 495;
    const totalColWidth = columns.reduce((sum, col) => sum + (col.width || 10), 0);
    let xPosition = 50;

    // Table headers
    doc.fontSize(10).font(this.fonts.bold);
    columns.forEach((col) => {
      const colWidth = (col.width || 10) / totalColWidth * totalWidth;
      const headerText = col.header || col.label || col.key || 'Unknown';
      doc.text(headerText, xPosition, tableTop, {
        width: colWidth - 5,
        align: 'left'
      });
      xPosition += colWidth;
    });

    // Header separator
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke();

    // Table rows
    doc.fontSize(9).font(this.fonts.normal);
    let yPosition = doc.y + 15;

    data.slice(0, 50).forEach((row, rowIndex) => { // Limit to 50 rows for PDF
      const rowHeights = [];
      const rowValues = columns.map((col) => {
        const value = this._getNestedValue(row, col.key) || '';
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      });

      // Calculate row height for each cell
      columns.forEach((col, colIndex) => {
        const colWidth = (col.width || 10) / totalColWidth * totalWidth;
        const textHeight = doc.heightOfString(rowValues[colIndex], {
          width: colWidth - 5,
          align: 'left'
        });
        rowHeights.push(textHeight);
      });

      const rowHeight = Math.max(...rowHeights, 12) + 6;

      if (yPosition + rowHeight > 750) { // New page if needed
        doc.addPage();
        yPosition = 50;
      }

      xPosition = 50;
      columns.forEach((col, colIndex) => {
        const colWidth = (col.width || 10) / totalColWidth * totalWidth;
        doc.text(rowValues[colIndex], xPosition, yPosition, {
          width: colWidth - 5,
          align: 'left'
        });
        xPosition += colWidth;
      });

      yPosition += rowHeight;
    });

    if (data.length > 50) {
      doc.moveDown(1);
      doc.fontSize(10).text(`... and ${data.length - 50} more records`);
    }
  }

  _addWrappedText(doc, text, fontSize = 11) {
    doc.fontSize(fontSize).font(this.fonts.normal);

    const lines = text.split('\n');
    lines.forEach(line => {
      const words = line.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const width = doc.widthOfString(testLine);

        if (width > 495 && currentLine) {
          doc.text(currentLine, { width: 495, align: 'left' });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        doc.text(currentLine, { width: 495, align: 'left' });
      }
    });
  }

  _addReportFooter(doc, creator, generatedAt = new Date()) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Footer line
      doc.moveTo(50, 780).lineTo(545, 780).stroke();

      // Footer text
      doc.fontSize(8).font(this.fonts.normal)
         .text('VIMS - Village Integrated Management System', 50, 790, { align: 'center' })
         .text(`Page ${i + 1} of ${pageCount}`, 50, 790, { align: 'right' })
         .text(`Generated on ${generatedAt.toLocaleString()}`, 50, 800, { align: 'center' });

      // Creator info in footer
      if (creator) {
        doc.fontSize(8).font(this.fonts.normal)
           .text(`Generated by: ${creator.firstName} ${creator.lastName}`, 50, 810, { align: 'center' });
      }
    }
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
}

module.exports = new PDFReportService();