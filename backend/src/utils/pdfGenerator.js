const PDFDocument = require('pdfkit');

/**
 * Generates a formatted PDF report stream/buffer
 * @param {object} reportData Formatted report data
 * @param {string} reportData.title Report title
 * @param {string} reportData.subtitle Report subtitle / academic context
 * @param {object} reportData.metadata Key-value pairs of metadata (Academic Year, Lab, Section, etc.)
 * @param {object} reportData.summary Key-value pairs of summary statistics
 * @param {Array<string>} reportData.tableHeaders Column headers
 * @param {Array<Array<string|number>>} reportData.tableRows Row data
 * @returns {Promise<Buffer>} PDF Buffer
 */
function generatePdfReport(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#001849')
        .text('Apex STEM Labs — Academic Lab Management System', { align: 'center' });

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#2a4482')
        .text(reportData.title || 'Academic Performance & Evaluation Report', { align: 'center' });

      if (reportData.subtitle) {
        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .fillColor('#555555')
          .text(reportData.subtitle, { align: 'center' });
      }

      doc.moveDown(0.5);
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown(0.5);

      // Metadata Block
      if (reportData.metadata && Object.keys(reportData.metadata).length > 0) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
        const metaKeys = Object.keys(reportData.metadata);
        let metaY = doc.y;

        metaKeys.forEach((key, index) => {
          const xPos = index % 2 === 0 ? 45 : 300;
          if (index % 2 === 0 && index > 0) {
            metaY += 14;
          }
          doc.text(`${key}: `, xPos, metaY, { continued: true });
          doc.font('Helvetica').text(`${reportData.metadata[key]}`);
          doc.font('Helvetica-Bold');
        });

        doc.y = metaY + 18;
        doc
          .strokeColor('#e5e5e5')
          .lineWidth(0.5)
          .moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .stroke();
        doc.moveDown(0.5);
      }

      // Summary Statistics KPI Strip
      if (reportData.summary && Object.keys(reportData.summary).length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#001849').text('Summary Metrics:');
        doc.moveDown(0.2);

        doc.fontSize(9).font('Helvetica');
        const sumKeys = Object.keys(reportData.summary);
        let sumY = doc.y;

        sumKeys.forEach((key, index) => {
          const xPos = 45 + (index % 3) * 170;
          if (index % 3 === 0 && index > 0) {
            sumY += 14;
          }
          doc.font('Helvetica-Bold').text(`${key}: `, xPos, sumY, { continued: true });
          doc.font('Helvetica').text(`${reportData.summary[key]}`);
        });

        doc.y = sumY + 18;
        doc
          .strokeColor('#e5e5e5')
          .lineWidth(0.5)
          .moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .stroke();
        doc.moveDown(0.5);
      }

      // Table Section
      const headers = reportData.tableHeaders || [];
      const rows = reportData.tableRows || [];

      if (headers.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#001849').text('Report Data:');
        doc.moveDown(0.3);

        const tableTop = doc.y;
        const colCount = headers.length;
        const tableWidth = 515;
        const colWidth = tableWidth / colCount;

        // Draw Table Header Background
        doc
          .rect(40, tableTop, tableWidth, 18)
          .fill('#f0f4fa');

        // Draw Header Text
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#001849');
        headers.forEach((header, i) => {
          doc.text(header, 42 + i * colWidth, tableTop + 5, {
            width: colWidth - 4,
            align: i === 0 ? 'left' : 'center',
            ellipsis: true
          });
        });

        let currentY = tableTop + 20;

        // Draw Rows
        if (rows.length === 0) {
          doc.fontSize(8).font('Helvetica-Oblique').fillColor('#777777');
          doc.text('No matching records found for this reporting criteria.', 45, currentY + 6, {
            align: 'center',
            width: tableWidth
          });
          currentY += 24;
        } else {
          doc.fontSize(8).font('Helvetica').fillColor('#222222');

          rows.forEach((row, rowIndex) => {
            // Page break check
            if (currentY > 750) {
              doc.addPage();
              currentY = 40;
            }

            // Alternating row background
            if (rowIndex % 2 === 1) {
              doc.rect(40, currentY, tableWidth, 16).fill('#fafafa');
            }

            doc.fillColor('#222222');
            row.forEach((cell, i) => {
              const textVal = cell !== null && cell !== undefined ? String(cell) : '-';
              doc.text(textVal, 42 + i * colWidth, currentY + 4, {
                width: colWidth - 4,
                align: i === 0 ? 'left' : 'center',
                ellipsis: true
              });
            });

            currentY += 16;
          });
        }

        // Bottom border of table
        doc
          .strokeColor('#cccccc')
          .lineWidth(0.5)
          .moveTo(40, currentY)
          .lineTo(555, currentY)
          .stroke();
      }

      // Footer
      doc.fontSize(7).font('Helvetica').fillColor('#888888');
      doc.text(
        `Generated on: ${new Date().toLocaleString()} | Official Academic Record | Department Matrix Core v2.0`,
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePdfReport
};
