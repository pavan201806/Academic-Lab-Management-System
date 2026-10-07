const ExcelJS = require('exceljs');
const { User, Section } = require('../models');
const AppError = require('../utils/appError');
const { ALPHANUMERIC_REGEX } = require('../validators/auth.validator');

class BulkStudentService {
  /**
   * Safe string extractor for ExcelJS cell values
   * Handles strings, numbers, rich text, formula results, and dates.
   */
  getCellValueAsString(cell) {
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    const val = cell.value;
    if (typeof val === 'string') {
      return val.trim();
    }
    if (typeof val === 'number') {
      return String(val).trim();
    }
    if (typeof val === 'object') {
      if (val.text) {
        return String(val.text).trim();
      }
      if (val.result !== undefined && val.result !== null) {
        return String(val.result).trim();
      }
      if (Array.isArray(val.richText)) {
        return val.richText.map((t) => t.text || '').join('').trim();
      }
    }
    return String(val).trim();
  }

  /**
   * Detects header column indices for Roll Number and Student Name
   */
  detectHeaders(worksheet) {
    let rollColIndex = -1;
    let nameColIndex = -1;
    let headerRowIndex = -1;

    const rollRegex = /^(roll\s*(no\.?|number)?|regd?\s*(no\.?|number)?|htno|hall\s*ticket|enrollment\s*(no\.?|id)?|student\s*id)$/i;
    const nameRegex = /^(name\s*(of\s*(the\s*)?student)?|student\s*name|candidate\s*name|full\s*name|^name$)/i;

    const rollLooseRegex = /(roll\s*no|roll\s*number|enrollment|regd?\s*no|htno)/i;
    const nameLooseRegex = /(name\s*(of\s*(the\s*)?student)?|student\s*name|candidate\s*name|full\s*name)/i;

    // Search rows 1 to 10 for header indicators
    for (let r = 1; r <= Math.min(worksheet.rowCount || 10, 15); r++) {
      const row = worksheet.getRow(r);
      let foundRoll = -1;
      let foundName = -1;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const cellText = this.getCellValueAsString(cell);
        if (!cellText) return;

        if (rollRegex.test(cellText) || rollLooseRegex.test(cellText)) {
          foundRoll = colNumber;
        } else if (nameRegex.test(cellText) || nameLooseRegex.test(cellText)) {
          foundName = colNumber;
        }
      });

      if (foundRoll !== -1 && foundName !== -1 && foundRoll !== foundName) {
        rollColIndex = foundRoll;
        nameColIndex = foundName;
        headerRowIndex = r;
        break;
      }
    }

    // Fallback: If no explicit match, check column 1 and 2 if row 1 contains any text
    if (headerRowIndex === -1 && (worksheet.rowCount || 0) > 0) {
      const row1 = worksheet.getRow(1);
      const col1Text = this.getCellValueAsString(row1.getCell(1)).toLowerCase();
      const col2Text = this.getCellValueAsString(row1.getCell(2)).toLowerCase();

      if (col1Text.includes('roll') || col2Text.includes('name')) {
        rollColIndex = 1;
        nameColIndex = 2;
        headerRowIndex = 1;
      }
    }

    return {
      rollColIndex,
      nameColIndex,
      headerRowIndex
    };
  }

  /**
   * Parse workbook buffer and extract raw student rows grouped by worksheet (section)
   */
  async parseWorkbook(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError('Uploaded file buffer is empty or invalid', 400);
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch (err) {
      throw new AppError(
        'Failed to parse Excel workbook. Please ensure the file is a valid .xlsx format: ' + err.message,
        400
      );
    }

    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      throw new AppError('The uploaded Excel workbook contains no worksheets', 400);
    }

    const parsedSheets = [];

    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name ? worksheet.name.trim() : `Sheet${worksheet.id}`;
      const { rollColIndex, nameColIndex, headerRowIndex } = this.detectHeaders(worksheet);

      const sheetData = {
        sheetName,
        headerFound: headerRowIndex !== -1,
        headerRowIndex,
        rollColIndex,
        nameColIndex,
        rawRows: [],
        error: null
      };

      if (headerRowIndex === -1) {
        // Check if sheet is completely empty
        let hasAnyData = false;
        worksheet.eachRow((row) => {
          if (row.hasValues) hasAnyData = true;
        });

        if (!hasAnyData) {
          sheetData.error = 'Worksheet is completely empty';
        } else {
          sheetData.error = 'Could not detect "Roll No." and "Name of the student" header columns in this worksheet';
        }
        parsedSheets.push(sheetData);
        return;
      }

      // Read all rows after header
      for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        if (!row || !row.hasValues) continue;

        const rawRoll = this.getCellValueAsString(row.getCell(rollColIndex));
        const rawName = this.getCellValueAsString(row.getCell(nameColIndex));

        // Skip completely blank rows
        if (!rawRoll && !rawName) {
          continue;
        }

        sheetData.rawRows.push({
          rowNumber: r,
          rawRoll,
          rawName
        });
      }

      parsedSheets.push(sheetData);
    });

    return parsedSheets;
  }

  /**
   * Preview and validate bulk student enrollment from an Excel buffer
   */
  async previewEnrollment(buffer, fileName = 'student_roll_list.xlsx') {
    const parsedSheets = await this.parseWorkbook(buffer);

    // Load all sections from database for matching
    const existingSections = await Section.find();
    const sectionByCode = new Map();
    const sectionByName = new Map();

    for (const sec of existingSections) {
      sectionByCode.set(sec.sectionCode.toUpperCase(), sec);
      sectionByName.set(sec.name.toLowerCase(), sec);
    }

    // Collect all roll numbers to check duplicates in Excel & DB
    const seenRollsInFile = new Map(); // normalizedRoll -> { sheetName, rowNumber }
    const allCandidateRolls = [];

    for (const sheet of parsedSheets) {
      for (const row of sheet.rawRows) {
        const cleanRoll = row.rawRoll.trim().toUpperCase();
        if (cleanRoll) {
          allCandidateRolls.push(cleanRoll);
        }
      }
    }

    // Query existing users from DB matching any candidate roll numbers
    const existingUsers = await User.find({
      rollNumber: { $in: allCandidateRolls }
    });
    const existingUserMap = new Map();
    for (const u of existingUsers) {
      existingUserMap.set(u.rollNumber.toUpperCase(), u);
    }

    const sectionsSummary = [];
    const records = [];

    let totalStudents = 0;
    let validCount = 0;
    let alreadyExistsCount = 0;
    let invalidCount = 0;

    for (const sheet of parsedSheets) {
      const sheetName = sheet.sheetName;
      const normalizedSheetCode = sheetName.toUpperCase();

      // Match worksheet name to database section
      const matchedSection =
        sectionByCode.get(normalizedSheetCode) ||
        sectionByName.get(sheetName.toLowerCase());

      let sectionError = null;
      let matchedSectionCode = '';
      let matchedSectionName = '';

      if (!matchedSection) {
        sectionError = `Section "${sheetName}" does not exist in the database. Please create this section first.`;
      } else if (!matchedSection.active) {
        sectionError = `Section "${matchedSection.sectionCode}" exists but is currently deactivated. Please activate it first.`;
        matchedSectionCode = matchedSection.sectionCode;
        matchedSectionName = matchedSection.name;
      } else {
        matchedSectionCode = matchedSection.sectionCode;
        matchedSectionName = matchedSection.name;
      }

      if (sheet.error && !sectionError) {
        sectionError = sheet.error;
      }

      let sheetTotal = 0;
      let sheetValid = 0;
      let sheetAlreadyExists = 0;
      let sheetInvalid = 0;

      for (const row of sheet.rawRows) {
        sheetTotal++;
        totalStudents++;

        const rawRoll = row.rawRoll;
        const rawName = row.rawName;
        const cleanRoll = rawRoll.trim().toUpperCase();
        const cleanName = rawName.replace(/\s+/g, ' ').trim();

        let status = 'VALID';
        let statusReason = 'Ready for enrollment';

        // 1. Check section matching
        if (sectionError) {
          status = 'INVALID';
          statusReason = sectionError;
        }

        // 2. Check roll number presence
        if (status === 'VALID' && (!cleanRoll || cleanRoll.length === 0)) {
          status = 'INVALID';
          statusReason = 'Roll number is required and cannot be empty';
        }

        // 3. Check roll number alphanumeric constraint
        if (status === 'VALID' && !ALPHANUMERIC_REGEX.test(cleanRoll)) {
          status = 'INVALID';
          statusReason = 'Roll number must contain only alphanumeric characters without spaces or symbols';
        }

        // 4. Check student name presence
        if (status === 'VALID' && (!cleanName || cleanName.length === 0)) {
          status = 'INVALID';
          statusReason = 'Student name is required and cannot be empty';
        }

        // 5. Check duplicates within the uploaded workbook
        if (status === 'VALID') {
          if (seenRollsInFile.has(cleanRoll)) {
            const prev = seenRollsInFile.get(cleanRoll);
            status = 'INVALID';
            statusReason = `Duplicate roll number '${cleanRoll}' in uploaded file (First seen in Sheet: ${prev.sheetName}, Row: ${prev.rowNumber})`;
          } else {
            seenRollsInFile.set(cleanRoll, { sheetName, rowNumber: row.rowNumber });
          }
        }

        // 6. Check if student / user already exists in DB
        if (status === 'VALID' && existingUserMap.has(cleanRoll)) {
          const existingUser = existingUserMap.get(cleanRoll);
          status = 'ALREADY_EXISTS';

          if (existingUser.role === 'STUDENT') {
            if (existingUser.section && existingUser.section.toUpperCase() === matchedSectionCode) {
              statusReason = `Already enrolled in this section (${matchedSectionCode})`;
            } else if (existingUser.section) {
              statusReason = `Already assigned to another section (${existingUser.section})`;
            } else {
              statusReason = 'Student already exists in database (Unassigned section)';
            }
          } else {
            statusReason = `User with this roll number already exists as ${existingUser.role}`;
          }
        }

        if (status === 'VALID') {
          sheetValid++;
          validCount++;
        } else if (status === 'ALREADY_EXISTS') {
          sheetAlreadyExists++;
          alreadyExistsCount++;
        } else {
          sheetInvalid++;
          invalidCount++;
        }

        records.push({
          rollNumber: cleanRoll || row.rawRoll,
          name: cleanName || row.rawName,
          section: matchedSectionCode || sheetName,
          sheetName,
          rowNumber: row.rowNumber,
          status,
          statusReason
        });
      }

      sectionsSummary.push({
        sheetName,
        sectionCode: matchedSectionCode || sheetName,
        sectionName: matchedSectionName || sheetName,
        matched: !!matchedSection && matchedSection.active,
        totalStudents: sheetTotal,
        validCount: sheetValid,
        alreadyExistsCount: sheetAlreadyExists,
        invalidCount: sheetInvalid,
        error: sectionError
      });
    }

    return {
      fileName,
      totalStudents,
      validCount,
      alreadyExistsCount,
      invalidCount,
      sections: sectionsSummary,
      records
    };
  }

  /**
   * Execute bulk student import into MongoDB
   * Safe, server-authoritative creation with temporary passwords and section cohort assignments.
   */
  async importStudents({ records, defaultPassword = 'StudentTemp#2026', fileBuffer, fileName }) {
    let candidateRecords = records;

    // If fileBuffer is provided, re-parse and validate server-side for maximum safety
    if (fileBuffer) {
      const preview = await this.previewEnrollment(fileBuffer, fileName);
      candidateRecords = preview.records;
    }

    if (!Array.isArray(candidateRecords) || candidateRecords.length === 0) {
      throw new AppError('No student records provided for enrollment', 400);
    }

    // Filter strictly to valid records
    const validRecords = candidateRecords.filter((r) => r.status === 'VALID' || (!r.status && r.rollNumber && r.name && r.section));

    if (validRecords.length === 0) {
      throw new AppError('No valid student records available to import', 400);
    }

    const tempPassword = (defaultPassword && typeof defaultPassword === 'string' && defaultPassword.length >= 6)
      ? defaultPassword.trim()
      : 'StudentTemp#2026';

    const passwordHash = await User.hashPassword(tempPassword);

    const createdStudents = [];
    const errors = [];
    const bySection = {};

    // Get active sections map for final validation
    const activeSections = await Section.find({ active: true });
    const activeSectionCodes = new Set(activeSections.map((s) => s.sectionCode.toUpperCase()));

    for (const record of validRecords) {
      const cleanRoll = (record.rollNumber || '').trim().toUpperCase();
      const cleanName = (record.name || '').replace(/\s+/g, ' ').trim();
      const cleanSection = (record.section || '').trim().toUpperCase();

      // Final server-side guards
      if (!cleanRoll || !ALPHANUMERIC_REGEX.test(cleanRoll)) {
        errors.push({
          rollNumber: cleanRoll,
          name: cleanName,
          error: 'Invalid or non-alphanumeric roll number'
        });
        continue;
      }

      if (!cleanName) {
        errors.push({
          rollNumber: cleanRoll,
          name: cleanName,
          error: 'Missing student name'
        });
        continue;
      }

      if (!activeSectionCodes.has(cleanSection)) {
        errors.push({
          rollNumber: cleanRoll,
          name: cleanName,
          section: cleanSection,
          error: `Target section '${cleanSection}' is not active or does not exist`
        });
        continue;
      }

      // Check if user already exists
      const existing = await User.findOne({ rollNumber: cleanRoll });
      if (existing) {
        errors.push({
          rollNumber: cleanRoll,
          name: cleanName,
          error: `User with roll number '${cleanRoll}' already exists in database`
        });
        continue;
      }

      try {
        const newUser = await User.create({
          name: cleanName,
          rollNumber: cleanRoll,
          passwordHash,
          role: 'STUDENT',
          mustChangePassword: true,
          section: cleanSection,
          active: true
        });

        createdStudents.push({
          _id: newUser._id,
          rollNumber: newUser.rollNumber,
          name: newUser.name,
          section: newUser.section
        });

        bySection[cleanSection] = (bySection[cleanSection] || 0) + 1;
      } catch (err) {
        errors.push({
          rollNumber: cleanRoll,
          name: cleanName,
          error: err.message
        });
      }
    }

    const createdCount = createdStudents.length;
    const failedCount = errors.length;

    return {
      totalProcessed: candidateRecords.length,
      createdCount,
      failedCount,
      bySection,
      temporaryPasswordUsed: tempPassword,
      createdStudents,
      errors
    };
  }
}

module.exports = new BulkStudentService();
