const pdfParse = require('pdf-parse');
const AppError = require('../utils/appError');

class PdfExtractionService {
  /**
   * Validate that the buffer is a valid PDF
   * @param {Buffer} buffer
   */
  validatePdfBuffer(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new AppError('No valid file buffer provided', 400);
    }

    // Check PDF magic bytes (%PDF-)
    const header = buffer.toString('utf8', 0, 5);
    if (!header.startsWith('%PDF-')) {
      throw new AppError('Invalid file format. The uploaded file is not a valid PDF document.', 400);
    }
  }

  /**
   * Extract raw text from PDF buffer
   * @param {Buffer} buffer
   * @returns {Promise<{text: string, numPages: number, info: object}>}
   */
  async extractTextFromPdf(buffer) {
    this.validatePdfBuffer(buffer);

    try {
      const data = await pdfParse(buffer, {
        max: 50 // Limit to first 50 pages for safety
      });

      if (!data || !data.text || data.text.trim().length < 10) {
        throw new AppError(
          'Unable to extract text from this PDF. Please ensure the file is a text-based PDF rather than a scanned image document.',
          400
        );
      }

      return {
        text: data.text,
        numPages: data.numpages || 1,
        info: data.info || {}
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        'Failed to parse PDF document. The file may be corrupt, password-protected, or malformed.',
        400
      );
    }
  }

  /**
   * Parse extracted text into structured experiment objects
   * @param {string} rawText
   * @returns {Array<object>} Extracted experiments
   */
  parseExperimentsFromText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new AppError('Raw text is required for experiment extraction', 400);
    }

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const extracted = [];
    const seenNumbers = new Set();

    // Regex patterns for detecting experiments
    // Pattern A: "Experiment 1: Title", "EXP 01 - Title", "Lab 2: Title", "Exercise 3. Title"
    const expRegexA = /^(?:Experiment|Exp|Lab|Exercise|Practical)\s*[-:]?\s*(\d{1,2})[.:\-–—\s]+(.+)$/i;
    // Pattern B: "1. Title" or "1) Title" where title has meaningful length
    const expRegexB = /^(\d{1,2})[.)\]]\s+(.+)$/;
    // Pattern C: "Experiment I: Title" (Roman numerals)
    const expRegexC = /^(?:Experiment|Exp|Lab)\s+([IVXLCDM]+)[.:\-–—\s]+(.+)$/i;

    const romanToInt = {
      I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
      VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12
    };

    let currentExp = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      let match = line.match(expRegexA);
      let expNum = null;
      let title = null;

      if (match) {
        expNum = parseInt(match[1], 10);
        title = match[2].trim();
      } else {
        match = line.match(expRegexC);
        if (match && romanToInt[match[1].toUpperCase()]) {
          expNum = romanToInt[match[1].toUpperCase()];
          title = match[2].trim();
        } else {
          match = line.match(expRegexB);
          if (match) {
            const potentialNum = parseInt(match[1], 10);
            const potentialTitle = match[2].trim();
            // Ensure title looks like an experiment name (starts with uppercase, length > 4)
            if (potentialNum >= 1 && potentialNum <= 12 && potentialTitle.length >= 4 && /^[A-Z]/.test(potentialTitle)) {
              expNum = potentialNum;
              title = potentialTitle;
            }
          }
        }
      }

      if (expNum !== null && title) {
        // Clean up title (remove trailing punctuation or page numbers)
        title = title.replace(/[.:\-–—\s]+$/, '').replace(/\s*\.{3,}\s*\d+$/, '');

        if (title.length > 200) {
          title = title.substring(0, 197) + '...';
        }

        // If experiment number already seen, assign sequential unassigned number
        let finalNum = expNum;
        if (seenNumbers.has(finalNum) || finalNum < 1 || finalNum > 12) {
          finalNum = 1;
          while (seenNumbers.has(finalNum) && finalNum <= 12) {
            finalNum++;
          }
        }

        if (finalNum <= 12) {
          seenNumbers.add(finalNum);
          currentExp = {
            experimentNumber: finalNum,
            title: title,
            description: '',
            objective: '',
            instructions: '',
            programmingLanguages: this.detectLanguages(title + ' ' + (lines[i + 1] || '')),
            confidence: 95
          };
          extracted.push(currentExp);
        }
      } else if (currentExp) {
        // Look for objective, aim, or procedure in lines following the heading
        const lower = line.toLowerCase();
        if (lower.startsWith('aim:') || lower.startsWith('objective:')) {
          currentExp.objective = line.replace(/^(?:aim|objective):\s*/i, '').trim();
        } else if (lower.startsWith('description:')) {
          currentExp.description = line.replace(/^description:\s*/i, '').trim();
        } else if (lower.startsWith('procedure:') || lower.startsWith('algorithm:')) {
          currentExp.instructions = line.replace(/^(?:procedure|algorithm):\s*/i, '').trim();
        }
      }
    }

    // Fallback: If no structured experiments matched, try finding line items
    if (extracted.length === 0) {
      for (let i = 0; i < lines.length && extracted.length < 12; i++) {
        const line = lines[i];
        if (line.length >= 8 && line.length <= 150 && /^[A-Z]/.test(line)) {
          const num = extracted.length + 1;
          extracted.push({
            experimentNumber: num,
            title: line.replace(/[.:\-–—\s]+$/, ''),
            description: '',
            objective: '',
            instructions: '',
            programmingLanguages: this.detectLanguages(line),
            confidence: 70
          });
        }
      }
    }

    if (extracted.length === 0) {
      throw new AppError(
        'No experiments could be detected from this PDF. Please verify the document format or use manual experiment creation.',
        400
      );
    }

    // Sort by experimentNumber
    extracted.sort((a, b) => a.experimentNumber - b.experimentNumber);

    return extracted;
  }

  /**
   * Helper to detect mentioned programming languages
   */
  detectLanguages(text) {
    const langs = [];
    const lower = text.toLowerCase();

    if (/\b(c\+\+|cpp)\b/.test(lower)) langs.push('C++');
    if (/\b(c language|\bc\b(?!\+\+|#))\b/.test(lower)) langs.push('C');
    if (/\b(java)\b/.test(lower)) langs.push('Java');
    if (/\b(python|py)\b/.test(lower)) langs.push('Python');

    // Default to all standard languages if none explicitly isolated
    return langs.length > 0 ? langs : ['C', 'C++', 'Java', 'Python'];
  }
}

module.exports = new PdfExtractionService();
