const AppError = require('../../utils/appError');

class Judge0ExecutionProvider {
  constructor(options = {}) {
    this.apiUrl = (options.apiUrl || process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/+$/, '');
    this.authToken = options.authToken !== undefined ? options.authToken : (process.env.JUDGE0_AUTH_TOKEN || '');
    this.rapidApiKey = options.rapidApiKey !== undefined ? options.rapidApiKey : (process.env.JUDGE0_RAPIDAPI_KEY || '');
    this.rapidApiHost = options.rapidApiHost !== undefined ? options.rapidApiHost : (process.env.JUDGE0_RAPIDAPI_HOST || '');
    this.timeoutMs = options.timeoutMs || parseInt(process.env.JUDGE0_TIMEOUT_MS, 10) || 15000;
    this.pollIntervalMs = options.pollIntervalMs || parseInt(process.env.JUDGE0_POLL_INTERVAL_MS, 10) || 350;
    this.cpuTimeLimit = options.cpuTimeLimit || 5.0; // 5 seconds
    this.memoryLimit = options.memoryLimit || 256000; // 256 MB in KB
    this.maxFileSize = options.maxFileSize || 1024; // 1024 KB

    this.languageOverrides = options.languageOverrides || {
      C: process.env.JUDGE0_LANG_C ? parseInt(process.env.JUDGE0_LANG_C, 10) : undefined,
      'C++': process.env.JUDGE0_LANG_CPP ? parseInt(process.env.JUDGE0_LANG_CPP, 10) : undefined,
      Java: process.env.JUDGE0_LANG_JAVA ? parseInt(process.env.JUDGE0_LANG_JAVA, 10) : undefined,
      Python: process.env.JUDGE0_LANG_PYTHON ? parseInt(process.env.JUDGE0_LANG_PYTHON, 10) : undefined
    };

    // Cached language map and available languages list from /languages
    this.languageMap = null;
    this.availableLanguages = null;
  }

  /**
   * Constructs authorization and content headers for requests to Judge0
   */
  buildHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (this.authToken) {
      headers['X-Auth-Token'] = this.authToken;
    }
    if (this.rapidApiKey) {
      headers['X-RapidAPI-Key'] = this.rapidApiKey;
    }
    if (this.rapidApiHost) {
      headers['X-RapidAPI-Host'] = this.rapidApiHost;
    }

    return headers;
  }

  /**
   * Encodes a UTF-8 string to Base64
   */
  encodeBase64(str) {
    if (str === null || str === undefined) return '';
    return Buffer.from(String(str), 'utf8').toString('base64');
  }

  /**
   * Decodes a Base64 string to UTF-8
   */
  decodeBase64(val) {
    if (!val || typeof val !== 'string') return '';
    try {
      return Buffer.from(val, 'base64').toString('utf8');
    } catch (_) {
      return val;
    }
  }

  /**
   * Queries the configured Judge0 instance's /languages endpoint to discover language IDs
   * @returns {Promise<Record<string, number>>} Map of language name to ID
   */
  async fetchLanguageMap() {
    const url = `${this.apiUrl}/languages`;
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders()
      });
    } catch (err) {
      throw new AppError(`Failed to connect to Judge0 at ${this.apiUrl}: ${err.message}`, 503);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppError('Judge0 authentication failed while querying languages. Check API credentials.', 500);
    }

    if (!response.ok) {
      throw new AppError(`Judge0 /languages returned HTTP ${response.status} ${response.statusText}`, 502);
    }

    const list = await response.json();
    if (!Array.isArray(list)) {
      throw new AppError('Judge0 /languages did not return an array of languages', 502);
    }

    this.availableLanguages = list;
    const resolved = {};

    // 1. Python: match Python (3.x) or Python 3, strictly excluding Python 2
    const py = list.find((l) => /python.*3\./i.test(l.name)) || list.find((l) => /python\s*\(?\s*3/i.test(l.name));
    if (py) resolved['Python'] = py.id;

    // 2. Java: match Java (OpenJDK ...) or Java (JDK ...), strictly excluding JavaScript and JavaFX
    const java = list.find((l) => /^java\s*\((openjdk|jdk)/i.test(l.name)) || list.find((l) => /^java\s*\(/i.test(l.name));
    if (java) resolved['Java'] = java.id;

    // 3. C++: match C++ (GCC ...) or C++ (g++ ...), excluding Clang unless GCC not found
    const cpp = list.find((l) => /^c\+\+\s*\(gcc/i.test(l.name)) || list.find((l) => /^c\+\+/i.test(l.name));
    if (cpp) resolved['C++'] = cpp.id;

    // 4. C: match C (GCC ...) or C (gcc ...), strictly excluding C++, C#, Clojure
    const c = list.find((l) => /^c\s*\(gcc/i.test(l.name)) || list.find((l) => /^c\s*\(/i.test(l.name) && !/c\+\+|c#|clojure/i.test(l.name));
    if (c) resolved['C'] = c.id;

    return resolved;
  }

  /**
   * Resolves the Judge0 language ID for a requested language
   * @param {'C'|'C++'|'Java'|'Python'} language
   * @returns {Promise<number>}
   */
  async resolveLanguageId(language) {
    // 1. Check explicit environment override
    const override = this.languageOverrides[language];
    if (override !== undefined && override !== null && override !== '') {
      const id = parseInt(override, 10);
      if (isNaN(id) || id <= 0) {
        throw new AppError(`Invalid language ID override configured for '${language}': must be a positive integer`, 400);
      }
      // Validate that the configured ID exists on the instance and matches the language
      await this.validateLanguageId(language, id);
      return id;
    }

    // 2. Check cached language map
    if (this.languageMap && this.languageMap[language]) {
      return this.languageMap[language];
    }

    // 3. Discover dynamically from Judge0 /languages
    try {
      const dynamicMap = await this.fetchLanguageMap();
      this.languageMap = {
        C: dynamicMap.C || 103,
        'C++': dynamicMap['C++'] || 105,
        Java: dynamicMap.Java || 91,
        Python: dynamicMap.Python || 92,
        ...dynamicMap
      };

      if (this.languageMap[language]) {
        return this.languageMap[language];
      }
    } catch (err) {
      // If fetching fails during an offline or mock test run, fall back to verified modern instance IDs
      this.languageMap = {
        C: 103,
        'C++': 105,
        Java: 91,
        Python: 92
      };
      if (this.languageMap[language]) {
        return this.languageMap[language];
      }
      throw err;
    }

    throw new AppError(`Unsupported programming language for Judge0 execution: ${language}`, 400);
  }

  /**
   * Validates that an explicit language ID corresponds to the expected language name
   * @param {'C'|'C++'|'Java'|'Python'} language
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async validateLanguageId(language, id) {
    if (!this.availableLanguages) {
      await this.fetchLanguageMap();
    }

    const item = this.availableLanguages.find((l) => l.id === id);
    if (!item) {
      throw new AppError(`Language ID ${id} was not found on the configured Judge0 instance (${this.apiUrl})`, 400);
    }

    const name = item.name.toLowerCase();
    switch (language) {
      case 'Python':
        if (!name.includes('python') || (!name.includes('3.') && !name.includes(' 3') && !name.includes('(3'))) {
          throw new AppError(`Configured language ID ${id} is '${item.name}', which is not Python 3`, 400);
        }
        break;
      case 'Java':
        if (!name.includes('java') || name.includes('javascript')) {
          throw new AppError(`Configured language ID ${id} is '${item.name}', not Java`, 400);
        }
        break;
      case 'C++':
        if (!name.includes('c++') && !name.includes('g++')) {
          throw new AppError(`Configured language ID ${id} is '${item.name}', not C++`, 400);
        }
        break;
      case 'C':
        if (name.includes('c++') || name.includes('c#') || name.includes('clojure') || (!name.startsWith('c ') && !name.startsWith('c(') && !name.includes('gcc'))) {
          throw new AppError(`Configured language ID ${id} is '${item.name}', not C`, 400);
        }
        break;
    }

    return true;
  }

  /**
   * Creates an asynchronous submission in Judge0 and returns the token
   * @param {number} languageId
   * @param {string} sourceCode
   * @param {string} stdin
   * @returns {Promise<string>} Submission token
   */
  async createSubmission(languageId, sourceCode, stdin = '') {
    const url = `${this.apiUrl}/submissions/?base64_encoded=true&wait=false`;
    const payload = {
      source_code: this.encodeBase64(sourceCode),
      language_id: languageId,
      stdin: this.encodeBase64(stdin),
      cpu_time_limit: this.cpuTimeLimit,
      memory_limit: this.memoryLimit,
      max_file_size: this.maxFileSize,
      enable_network: false
    };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new AppError(`Judge0 service unreachable at ${this.apiUrl}: ${err.message}`, 503);
    }

    if (response.status === 429) {
      throw new AppError('Judge0 API rate limit exceeded. Please wait a moment and try again.', 429);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppError('Judge0 authentication failed. Please verify JUDGE0_AUTH_TOKEN / JUDGE0_RAPIDAPI_KEY.', 500);
    }

    if (response.status === 503) {
      throw new AppError('Judge0 execution queue is currently full. Please try again shortly.', 503);
    }

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error || parsed.message || JSON.stringify(parsed);
      } catch (_) {}
      throw new AppError(`Judge0 submission creation failed (${response.status}): ${detail}`, response.status >= 500 ? 502 : 400);
    }

    const data = await response.json();
    if (!data || !data.token) {
      throw new AppError('Judge0 did not return a valid submission token', 502);
    }

    return data.token;
  }

  /**
   * Polls Judge0 until a terminal status is reached or the timeout expires
   * @param {string} token
   * @param {number} startTime
   * @returns {Promise<object>} Normalized ExecutionResult
   */
  async pollSubmission(token, startTime) {
    const fields = 'stdout,stderr,compile_output,message,exit_code,status,time,memory';
    const url = `${this.apiUrl}/submissions/${token}?base64_encoded=true&fields=${fields}`;
    let pollInterval = this.pollIntervalMs;
    const deadline = Date.now() + this.timeoutMs;

    // Initial wait before first status inquiry
    await new Promise((r) => setTimeout(r, Math.min(250, pollInterval)));

    while (Date.now() < deadline) {
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: this.buildHeaders()
        });
      } catch (err) {
        throw new AppError(`Failed while checking Judge0 submission status: ${err.message}`, 503);
      }

      if (response.status === 429) {
        // Back off on polling rate limit
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (!response.ok) {
        throw new AppError(`Error checking Judge0 submission status (${response.status})`, 502);
      }

      const data = await response.json();
      const statusId = data.status?.id;

      // Status 1: In Queue, Status 2: Processing -> continue polling
      if (statusId === 1 || statusId === 2) {
        await new Promise((r) => setTimeout(r, pollInterval));
        pollInterval = Math.min(1000, Math.round(pollInterval * 1.25));
        continue;
      }

      // Terminal status reached (statusId >= 3)
      return this.normalizeResult(data, startTime);
    }

    // Polling timeout reached
    return {
      stdout: '',
      stderr: `Execution timed out waiting for Judge0 worker (${this.timeoutMs}ms limit)`,
      exitCode: 124,
      executionTimeMs: this.timeoutMs,
      status: 'TIMEOUT'
    };
  }

  /**
   * Normalizes raw Judge0 response data into the CodeLab ExecutionResult schema
   * @param {object} data
   * @param {number} startTime
   * @returns {object} ExecutionResult
   */
  normalizeResult(data, startTime) {
    const stdout = this.decodeBase64(data.stdout);
    const rawStderr = this.decodeBase64(data.stderr);
    const compileOutput = this.decodeBase64(data.compile_output);
    const message = data.message
      ? typeof data.message === 'string' && data.message.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(data.message)
        ? this.decodeBase64(data.message)
        : data.message
      : '';

    const statusObj = data.status || {};
    const statusId = statusObj.id;
    const executionTimeMs = data.time !== undefined && data.time !== null
      ? Math.round(parseFloat(data.time) * 1000)
      : Math.max(0, Date.now() - startTime);

    // 1. Status 3: Accepted, or Status 4: Wrong Answer (when Judge0 evaluated expected_output)
    // Both signify the process executed to completion without runtime crash
    if (statusId === 3 || (statusId === 4 && (data.exit_code === 0 || data.exit_code === undefined))) {
      return {
        stdout,
        stderr: rawStderr,
        exitCode: data.exit_code !== undefined && data.exit_code !== null ? data.exit_code : 0,
        executionTimeMs,
        status: 'SUCCESS'
      };
    }

    // 2. Status 6: Compilation Error
    if (statusId === 6) {
      return {
        stdout,
        stderr: compileOutput || rawStderr || 'Compilation failed',
        exitCode: data.exit_code || 1,
        executionTimeMs,
        status: 'COMPILE_ERROR'
      };
    }

    // 3. Status 5: Time Limit Exceeded
    if (statusId === 5) {
      return {
        stdout,
        stderr: (rawStderr ? rawStderr + '\n' : '') + 'Execution timed out (Time Limit Exceeded: 5000ms)',
        exitCode: 124,
        executionTimeMs,
        status: 'TIMEOUT'
      };
    }

    // 4. Status 8: Runtime Error (SIGXFSZ) Output Limit Exceeded
    if (statusId === 8) {
      return {
        stdout,
        stderr: (rawStderr ? rawStderr + '\n' : '') + 'Standard output size limit exceeded (Max 64KB)',
        exitCode: 1,
        executionTimeMs,
        status: 'OUTPUT_LIMIT'
      };
    }

    // 5. Status 7, 9, 10, 11, 12: Runtime Errors (SIGSEGV, SIGFPE, SIGABRT, NZEC, etc.)
    if ([7, 9, 10, 11, 12].includes(statusId)) {
      return {
        stdout,
        stderr: rawStderr || message || `Process terminated with error (${statusObj.description || 'Runtime Error'})`,
        exitCode: data.exit_code || 1,
        executionTimeMs,
        status: 'RUNTIME_ERROR'
      };
    }

    // 6. Status 13, 14: Internal Error, Exec Format Error
    if ([13, 14].includes(statusId)) {
      return {
        stdout,
        stderr: message || rawStderr || `Judge0 internal execution error: ${statusObj.description || 'Internal Error'}`,
        exitCode: 1,
        executionTimeMs,
        status: 'EXECUTION_ERROR'
      };
    }

    // Fallback: If status is unrecognized, determine status by exit_code
    return {
      stdout,
      stderr: rawStderr || message || `Execution finished with status: ${statusObj.description || statusId}`,
      exitCode: data.exit_code !== undefined && data.exit_code !== null ? data.exit_code : 1,
      executionTimeMs,
      status: data.exit_code === 0 ? 'SUCCESS' : 'RUNTIME_ERROR'
    };
  }

  /**
   * Main entry point: Safely executes student source code using asynchronous Judge0 submission & polling.
   * @param {'C'|'C++'|'Java'|'Python'} language
   * @param {string} sourceCode
   * @param {string} stdin
   * @returns {Promise<object>} ExecutionResult
   */
  async execute(language, sourceCode, stdin = '') {
    if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
      throw new AppError('Source code cannot be empty', 400);
    }

    if (Buffer.byteLength(sourceCode, 'utf8') > 64 * 1024) {
      throw new AppError('Source code exceeds maximum allowed size of 64KB', 400);
    }

    if (stdin && Buffer.byteLength(stdin, 'utf8') > 16 * 1024) {
      throw new AppError('Standard input exceeds maximum allowed size of 16KB', 400);
    }

    const languageId = await this.resolveLanguageId(language);
    const startTime = Date.now();

    // Java class name normalization for Judge0 single-file execution:
    // If student code defines `public class Solution`, adapt to `public class Main` so Judge0's single-file Java runner compiles and executes without name conflict
    let preparedSource = sourceCode;
    if (language === 'Java') {
      const match = sourceCode.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      if (match && match[1] && match[1] !== 'Main') {
        const originalName = match[1];
        preparedSource = sourceCode
          .replace(new RegExp(`public\\s+class\\s+${originalName}\\b`), 'public class Main')
          .replace(new RegExp(`\\b${originalName}\\s*\\(`, 'g'), 'Main(');
      }
    }

    const token = await this.createSubmission(languageId, preparedSource, stdin);
    return await this.pollSubmission(token, startTime);
  }
}

module.exports = Judge0ExecutionProvider;
