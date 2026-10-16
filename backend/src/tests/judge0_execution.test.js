const assert = require('assert');
const Judge0ExecutionProvider = require('../services/providers/judge0ExecutionProvider');
const DockerExecutionProvider = require('../services/providers/dockerExecutionProvider');
const codeExecutionService = require('../services/codeExecutionService');
const AppError = require('../utils/appError');

console.log('=== Running Judge0 Provider & Migration Comprehensive Test Suite ===\n');

async function runJudge0Tests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Test ${total}] ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // Sample Judge0 /languages response payload representing modern instance
  const mockLanguagesList = [
    { id: 103, name: 'C (GCC 14.1.0)' },
    { id: 50, name: 'C (GCC 9.2.0)' },
    { id: 105, name: 'C++ (GCC 14.1.0)' },
    { id: 54, name: 'C++ (GCC 9.2.0)' },
    { id: 51, name: 'C# (Mono 6.6.0.161)' },
    { id: 91, name: 'Java (JDK 17.0.6)' },
    { id: 62, name: 'Java (OpenJDK 13.0.1)' },
    { id: 70, name: 'Python (2.7.17)' },
    { id: 92, name: 'Python (3.11.2)' },
    { id: 71, name: 'Python (3.8.1)' },
    { id: 72, name: 'Ruby (2.7.0)' },
    { id: 73, name: 'Rust (1.40.0)' }
  ];

  // Helper to mock global.fetch temporarily
  let origFetch = global.fetch;
  function mockFetch(handlers) {
    global.fetch = async (url, options = {}) => {
      for (const [pattern, handler] of Object.entries(handlers)) {
        if (url.includes(pattern) || (pattern instanceof RegExp && pattern.test(url))) {
          return await handler(url, options);
        }
      }
      throw new Error(`Unhandled mock fetch for URL: ${url}`);
    };
  }

  function restoreFetch() {
    global.fetch = origFetch;
  }

  // =========================================================================
  // SECTION 1: Base64 Encoding & Decoding
  // =========================================================================
  console.log('--- Section 1: Base64 Encoding & Decoding ---');

  await test('1. Base64 encodes string values correctly', () => {
    const provider = new Judge0ExecutionProvider();
    const encoded = provider.encodeBase64('print("Hello World")');
    assert.strictEqual(encoded, Buffer.from('print("Hello World")', 'utf8').toString('base64'));
  });

  await test('2. Base64 decodes standard and special characters safely', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = 'Special characters: < > & " \' \n \t \r\n 🚀';
    const encoded = provider.encodeBase64(raw);
    const decoded = provider.decodeBase64(encoded);
    assert.strictEqual(decoded, raw);
  });

  await test('3. Base64 decoder handles null, undefined, and empty string safely', () => {
    const provider = new Judge0ExecutionProvider();
    assert.strictEqual(provider.decodeBase64(null), '');
    assert.strictEqual(provider.decodeBase64(undefined), '');
    assert.strictEqual(provider.decodeBase64(''), '');
  });

  // =========================================================================
  // SECTION 2: Request Headers & Authentication
  // =========================================================================
  console.log('\n--- Section 2: Request Headers & Authentication ---');

  await test('4. Standard headers include Content-Type and Accept', () => {
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://ce.judge0.com' });
    const headers = provider.buildHeaders();
    assert.strictEqual(headers['Content-Type'], 'application/json');
    assert.strictEqual(headers['Accept'], 'application/json');
    assert.strictEqual(headers['X-Auth-Token'], undefined);
  });

  await test('5. X-Auth-Token header is attached when authToken is provided', () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0.internal',
      authToken: 'secret-token-123'
    });
    const headers = provider.buildHeaders();
    assert.strictEqual(headers['X-Auth-Token'], 'secret-token-123');
  });

  await test('6. RapidAPI headers (Key and Host) are attached when configured', () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      rapidApiKey: 'rapid-key-xyz',
      rapidApiHost: 'judge0-ce.p.rapidapi.com'
    });
    const headers = provider.buildHeaders();
    assert.strictEqual(headers['X-RapidAPI-Key'], 'rapid-key-xyz');
    assert.strictEqual(headers['X-RapidAPI-Host'], 'judge0-ce.p.rapidapi.com');
  });

  // =========================================================================
  // SECTION 3: Dynamic Language ID Resolution & Validation
  // =========================================================================
  console.log('\n--- Section 3: Dynamic Language ID Resolution & Validation ---');

  await test('7. Dynamic discovery resolves Python 3 (Python 3.11 ID 92, not Python 2 ID 70)', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    const pyId = await provider.resolveLanguageId('Python');
    assert.strictEqual(pyId, 92); // Python (3.11.2)
    restoreFetch();
  });

  await test('8. Dynamic discovery resolves OpenJDK/JDK Java, GCC C++, and GCC C', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    const javaId = await provider.resolveLanguageId('Java');
    const cppId = await provider.resolveLanguageId('C++');
    const cId = await provider.resolveLanguageId('C');

    assert.strictEqual(javaId, 91);  // Java (JDK 17.0.6)
    assert.strictEqual(cppId, 105); // C++ (GCC 14.1.0)
    assert.strictEqual(cId, 103);   // C (GCC 14.1.0)
    restoreFetch();
  });

  await test('9. Explicit environment variable overrides take priority after validation', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://mock.judge0',
      languageOverrides: {
        Python: 71, // Override to Python 3.8.1
        Java: 62    // Override to OpenJDK 13
      }
    });

    const pyId = await provider.resolveLanguageId('Python');
    const javaId = await provider.resolveLanguageId('Java');
    assert.strictEqual(pyId, 71);
    assert.strictEqual(javaId, 62);
    restoreFetch();
  });

  await test('10. Invalid non-numeric language override is rejected with 400', async () => {
    const provider = new Judge0ExecutionProvider({
      languageOverrides: { Python: 'invalid-id' }
    });

    await assert.rejects(
      async () => await provider.resolveLanguageId('Python'),
      (err) => err.statusCode === 400 && err.message.includes('positive integer')
    );
  });

  await test('11. Stale or mismatched override (e.g. Python pointing to Ruby) is rejected', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://mock.judge0',
      languageOverrides: {
        Python: 72 // 72 is Ruby
      }
    });

    await assert.rejects(
      async () => await provider.resolveLanguageId('Python'),
      (err) => err.statusCode === 400 && err.message.includes('not Python')
    );
    restoreFetch();
  });

  await test('12. Language ID validation rejects non-existent ID', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    await assert.rejects(
      async () => await provider.validateLanguageId('C', 99999),
      (err) => err.statusCode === 400 && err.message.includes('was not found')
    );
    restoreFetch();
  });

  await test('12b. Python 2 override (ID 70) is rejected as invalid for Python 3', async () => {
    mockFetch({
      '/languages': async () => ({
        ok: true,
        status: 200,
        json: async () => mockLanguagesList
      })
    });

    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://mock.judge0',
      languageOverrides: {
        Python: 70 // 70 is Python 2.7.17
      }
    });

    await assert.rejects(
      async () => await provider.resolveLanguageId('Python'),
      (err) => err.statusCode === 400 && err.message.includes('not Python 3')
    );
    restoreFetch();
  });

  // =========================================================================
  // SECTION 4: Output & Status Normalization
  // =========================================================================
  console.log('\n--- Section 4: Output & Status Normalization ---');

  await test('13. Status 3 (Accepted) normalizes to SUCCESS with exitCode 0', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 3, description: 'Accepted' },
      stdout: provider.encodeBase64('Hello, World!\n'),
      stderr: null,
      time: '0.042',
      memory: 380,
      exit_code: 0
    };

    const norm = provider.normalizeResult(raw, Date.now() - 50);
    assert.strictEqual(norm.status, 'SUCCESS');
    assert.strictEqual(norm.stdout, 'Hello, World!\n');
    assert.strictEqual(norm.stderr, '');
    assert.strictEqual(norm.exitCode, 0);
    assert.strictEqual(norm.executionTimeMs, 42);
  });

  await test('13b. Status 4 (Wrong Answer with exitCode 0) normalizes to SUCCESS for testcase evaluation', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 4, description: 'Wrong Answer' },
      stdout: provider.encodeBase64('Unexpected output\n'),
      stderr: null,
      time: '0.035',
      exit_code: 0
    };

    const norm = provider.normalizeResult(raw, Date.now() - 40);
    assert.strictEqual(norm.status, 'SUCCESS');
    assert.strictEqual(norm.stdout, 'Unexpected output\n');
    assert.strictEqual(norm.exitCode, 0);
  });

  await test('14. Status 6 (Compilation Error) extracts compiler error from compile_output', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 6, description: 'Compilation Error' },
      stdout: null,
      stderr: null,
      compile_output: provider.encodeBase64('solution.c:2:1: error: expected identifier\n'),
      time: '0.010',
      exit_code: 1
    };

    const norm = provider.normalizeResult(raw, Date.now());
    assert.strictEqual(norm.status, 'COMPILE_ERROR');
    assert.ok(norm.stderr.includes('solution.c:2:1: error'));
    assert.strictEqual(norm.exitCode, 1);
  });

  await test('15. Status 5 (Time Limit Exceeded) normalizes to TIMEOUT with exitCode 124', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 5, description: 'Time Limit Exceeded' },
      stdout: null,
      stderr: null,
      time: '5.002',
      exit_code: null
    };

    const norm = provider.normalizeResult(raw, Date.now());
    assert.strictEqual(norm.status, 'TIMEOUT');
    assert.strictEqual(norm.exitCode, 124);
    assert.ok(norm.stderr.includes('Time Limit Exceeded'));
  });

  await test('16. Status 8 (Output Limit Exceeded) normalizes to OUTPUT_LIMIT with exitCode 1', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 8, description: 'Runtime Error (SIGXFSZ)' },
      stdout: provider.encodeBase64('large text'),
      stderr: null,
      time: '0.100',
      exit_code: 1
    };

    const norm = provider.normalizeResult(raw, Date.now());
    assert.strictEqual(norm.status, 'OUTPUT_LIMIT');
    assert.strictEqual(norm.exitCode, 1);
    assert.ok(norm.stderr.includes('Standard output size limit exceeded'));
  });

  await test('17. Status 7, 9, 10, 11, 12 normalize to RUNTIME_ERROR', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 11, description: 'Runtime Error (NZEC)' },
      stdout: null,
      stderr: provider.encodeBase64('ZeroDivisionError: division by zero\n'),
      time: '0.025',
      exit_code: 1
    };

    const norm = provider.normalizeResult(raw, Date.now());
    assert.strictEqual(norm.status, 'RUNTIME_ERROR');
    assert.strictEqual(norm.exitCode, 1);
    assert.ok(norm.stderr.includes('ZeroDivisionError'));
  });

  await test('18. Status 13 (Internal Error) normalizes to EXECUTION_ERROR', () => {
    const provider = new Judge0ExecutionProvider();
    const raw = {
      status: { id: 13, description: 'Internal Error' },
      message: 'Server disk full',
      stdout: null,
      stderr: null
    };

    const norm = provider.normalizeResult(raw, Date.now());
    assert.strictEqual(norm.status, 'EXECUTION_ERROR');
    assert.ok(norm.stderr.includes('Internal Error') || norm.stderr.includes('Server disk full'));
  });

  // =========================================================================
  // SECTION 5: Asynchronous Polling & Queue Transitions
  // =========================================================================
  console.log('\n--- Section 5: Asynchronous Polling & Queue Transitions ---');

  await test('19. Polling handles In Queue -> Processing -> Accepted workflow', async () => {
    let pollCount = 0;
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://mock.judge0',
      pollIntervalMs: 50,
      timeoutMs: 2000
    });

    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async (url, opts) => {
        const body = JSON.parse(opts.body);
        assert.ok(body.source_code);
        assert.strictEqual(body.language_id, 92);
        return {
          ok: true,
          status: 201,
          json: async () => ({ token: 'mock-token-abc' })
        };
      },
      '/submissions/mock-token-abc': async () => {
        pollCount++;
        if (pollCount === 1) {
          // Attempt 1: Status 1 (In Queue)
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: { id: 1, description: 'In Queue' } })
          };
        }
        if (pollCount === 2) {
          // Attempt 2: Status 2 (Processing)
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: { id: 2, description: 'Processing' } })
          };
        }
        // Attempt 3: Status 3 (Accepted)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: { id: 3, description: 'Accepted' },
            stdout: provider.encodeBase64('Completed successfully\n'),
            stderr: null,
            time: '0.050',
            exit_code: 0
          })
        };
      }
    });

    const result = await provider.execute('Python', 'print("Completed successfully")');
    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.stdout, 'Completed successfully\n');
    assert.strictEqual(pollCount, 3);
    restoreFetch();
  });

  await test('20. Polling timeout returns safe TIMEOUT status without crashing', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://mock.judge0',
      pollIntervalMs: 20,
      timeoutMs: 100 // Short 100ms timeout for test
    });

    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async () => ({
        ok: true,
        status: 201,
        json: async () => ({ token: 'stuck-token' })
      }),
      '/submissions/stuck-token': async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: { id: 1, description: 'In Queue' } })
      })
    });

    const result = await provider.execute('Python', 'while True: pass');
    assert.strictEqual(result.status, 'TIMEOUT');
    assert.strictEqual(result.exitCode, 124);
    assert.ok(result.stderr.includes('timed out'));
    restoreFetch();
  });

  // =========================================================================
  // SECTION 6: Error Handling & Guardrails (No Attempt Consumption)
  // =========================================================================
  console.log('\n--- Section 6: Error Handling & Guardrails ---');

  await test('21. HTTP 429 Rate Limit from Judge0 throws AppError(429)', async () => {
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })
    });

    await assert.rejects(
      async () => await provider.execute('Python', 'print(1)'),
      (err) => err.statusCode === 429 && err.message.includes('rate limit')
    );
    restoreFetch();
  });

  await test('22. HTTP 503 Queue Full throws AppError(503) without corrupting submission', async () => {
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })
    });

    await assert.rejects(
      async () => await provider.execute('Python', 'print(1)'),
      (err) => err.statusCode === 503 && err.message.includes('queue is currently full')
    );
    restoreFetch();
  });

  await test('23. HTTP 401/403 Invalid Credentials throws AppError(500)', async () => {
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });
    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })
    });

    await assert.rejects(
      async () => await provider.execute('Python', 'print(1)'),
      (err) => err.statusCode === 500 && err.message.includes('authentication failed')
    );
    restoreFetch();
  });

  await test('24. Network failure (fetch error) throws AppError(503)', async () => {
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://unreachable.judge0.invalid' });
    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async () => {
        throw new Error('ECONNREFUSED');
      }
    });

    await assert.rejects(
      async () => await provider.execute('Python', 'print(1)'),
      (err) => err.statusCode === 503 && err.message.includes('unreachable')
    );
    restoreFetch();
  });

  // =========================================================================
  // SECTION 7: Java Class Normalization
  // =========================================================================
  console.log('\n--- Section 7: Java Class Normalization ---');

  await test('25. Java code with public class Solution is rewritten to public class Main for single-file Judge0 execution', async () => {
    let capturedSource = '';
    const provider = new Judge0ExecutionProvider({ apiUrl: 'https://mock.judge0' });

    mockFetch({
      '/submissions/?base64_encoded=true&wait=false': async (url, opts) => {
        const body = JSON.parse(opts.body);
        capturedSource = provider.decodeBase64(body.source_code);
        return {
          ok: true,
          status: 201,
          json: async () => ({ token: 'java-tok' })
        };
      },
      '/submissions/java-tok': async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: { id: 3, description: 'Accepted' },
          stdout: provider.encodeBase64('Java Output OK\n'),
          exit_code: 0
        })
      })
    });

    const inputJava = `public class Solution {
      public Solution() {}
      public static void main(String[] args) {
        System.out.println("Java Output OK");
      }
    }`;

    await provider.execute('Java', inputJava);
    assert.ok(capturedSource.includes('public class Main'));
    assert.ok(capturedSource.includes('Main()'));
    assert.ok(!capturedSource.includes('public class Solution'));
    restoreFetch();
  });

  // =========================================================================
  // SECTION 8: Provider Facade & Switching in codeExecutionService
  // =========================================================================
  console.log('\n--- Section 8: Provider Facade & Switching in codeExecutionService ---');

  await test('26. codeExecutionService selects Judge0 provider when EXECUTION_PROVIDER=judge0', () => {
    process.env.EXECUTION_PROVIDER = 'judge0';
    const provider = codeExecutionService.getProvider();
    assert.ok(provider instanceof Judge0ExecutionProvider);
  });

  await test('27. codeExecutionService selects Docker provider when EXECUTION_PROVIDER=docker', () => {
    process.env.EXECUTION_PROVIDER = 'docker';
    const provider = codeExecutionService.getProvider();
    assert.ok(provider instanceof DockerExecutionProvider);
    // Restore default to judge0
    process.env.EXECUTION_PROVIDER = 'judge0';
  });

  await test('28. Unsupported EXECUTION_PROVIDER throws AppError(500)', () => {
    process.env.EXECUTION_PROVIDER = 'kubernetes';
    assert.throws(
      () => codeExecutionService.getProvider(),
      (err) => err.statusCode === 500 && err.message.includes('Unsupported execution provider')
    );
    process.env.EXECUTION_PROVIDER = 'judge0';
  });

  await test('29. Source code size limit (>64KB) is rejected before provider dispatch', async () => {
    const huge = 'a = 1\n' + ' '.repeat(70000);
    await assert.rejects(
      async () => await codeExecutionService.execute('Python', huge),
      (err) => err.statusCode === 400 && err.message.includes('64KB')
    );
  });

  await test('30. Standard input size limit (>16KB) is rejected before provider dispatch', async () => {
    const hugeStdin = 'x'.repeat(20000);
    await assert.rejects(
      async () => await codeExecutionService.execute('Python', 'print(1)', hugeStdin),
      (err) => err.statusCode === 400 && err.message.includes('16KB')
    );
  });

  console.log(`\n==================================================`);
  console.log(`Judge0 Execution Test Suite: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runJudge0Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during Judge0 tests:', err);
    process.exit(1);
  });
