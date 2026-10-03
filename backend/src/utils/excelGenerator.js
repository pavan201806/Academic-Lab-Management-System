const ExcelJS = require('exceljs');

/**
 * Generates an Excel XLSX workbook buffer
 * @param {object} reportData Formatted report data
 * @param {string} reportData.title Report title
 * @param {object} reportData.metadata Key-value pairs of metadata
 * @param {object} reportData.summary Key-value pairs of summary metrics
 * @param {Array<string>} reportData.tableHeaders Column headers
 * @param {Array<Array<string|number>>} reportData.tableRows Row data
 * @returns {Promise<Buffer>} Excel buffer
 */
async function generateExcelReport(reportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Apex STEM Labs';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Academic Report');

  // Title Row
  worksheet.mergeCells('A1', 'H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Apex STEM Labs — ${reportData.title || 'Academic Report'}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF001849' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  let currentRow = 3;

  // Metadata block
  if (reportData.metadata && Object.keys(reportData.metadata).length > 0) {
    for (const [key, value] of Object.entries(reportData.metadata)) {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = `${key}:`;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = String(value);
      currentRow++;
    }
    currentRow++;
  }

  // Summary Metrics block
  if (reportData.summary && Object.keys(reportData.summary).length > 0) {
    const sumHeader = worksheet.getRow(currentRow);
    sumHeader.getCell(1).value = 'Summary Metrics';
    sumHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF001849' } };
    currentRow++;

    for (const [key, value] of Object.entries(reportData.summary)) {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = `${key}:`;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = typeof value === 'number' ? value : String(value);
      currentRow++;
    }
    currentRow++;
  }

  // Table Data Headers
  const headers = reportData.tableHeaders || [];
  const rows = reportData.tableRows || [];

  if (headers.length > 0) {
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4482' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 24;
    currentRow++;

    // Table Data Rows
    if (rows.length === 0) {
      const emptyRow = worksheet.getRow(currentRow);
      emptyRow.getCell(1).value = 'No records found for this report.';
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      currentRow++;
    } else {
      rows.forEach((rowData, rIdx) => {
        const row = worksheet.getRow(currentRow);
        rowData.forEach((val, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.value = val !== null && val !== undefined ? val : '-';
          cell.alignment = { horizontal: cIdx === 0 ? 'left' : 'center' };
          if (rIdx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
        currentRow++;
      });
    }

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLen = cell.value ? String(cell.value).length : 0;
        if (cellLen > maxLen && cellLen < 60) {
          maxLen = cellLen;
        }
      });
      column.width = maxLen + 3;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateExcelReport
};
