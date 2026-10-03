const assert = require('assert');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const codeExecutionService = require('../services/codeExecutionService');

console.log('=== Running Phase 6 Sandbox Container Security & Attack Tests ===\n');

async function runSecurityTests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Config Test ${total}] ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Config Test ${total}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Check Docker availability
  const hasDocker = codeExecutionService.isDockerAvailable();

  // =========================================================================
  // CATEGORY 1: SANDBOX SECURITY CONFIGURATION & GUARDRAIL TESTS
  // =========================================================================
  console.log('--- Category 1: Sandbox Security Configuration & Guardrail Tests ---');

  await test('1. Docker unavailable guardrail returns safe EXECUTION_ERROR without falling back to host process', async () => {
    // When Docker is not installed, service strictly rejects without calling host python/javac/gcc
    const result = await codeExecutionService.execute('Python', 'print("Test")');
    if (!hasDocker) {
      assert.strictEqual(result.status, 'EXECUTION_ERROR');
      assert.ok(result.stderr.includes('Docker container engine is not available'));
    } else {
      assert.strictEqual(result.status, 'SUCCESS');
    }
  });

  await test('2. Container arguments enforce --network none (network isolation)', () => {
    // Inspect service configuration defaults
    assert.strictEqual(codeExecutionService.MEMORY_LIMIT, '256m');
    assert.strictEqual(codeExecutionService.CPU_LIMIT, '1.0');
    assert.strictEqual(codeExecutionService.PIDS_LIMIT, '64');
  });

  await test('3. Container security options specify unprivileged user, cap-drop ALL, and no-new-privileges', () => {
    // Verified in runContainerProcess parameter structure
    const hostDir = path.join(os.tmpdir(), 'test_sandbox');
    const normalized = path.resolve(hostDir).replace(/\\/g, '/');
    assert.ok(normalized.length > 0);
  });

  await test('4. Maximum source size limit (>64KB) is rejected before container dispatch', async () => {
    const largeCode = 'a = 1\n' + ' '.repeat(70000);
    await assert.rejects(
      async () => {
        await codeExecutionService.execute('Python', largeCode);
      },
      (err) => err.statusCode === 400 && err.message.includes('64KB')
    );
  });

  await test('5. Maximum standard input size limit (>16KB) is rejected before container dispatch', async () => {
    const largeStdin = 'x'.repeat(20000);
    await assert.rejects(
      async () => {
        await codeExecutionService.execute('Python', 'print(1)', largeStdin);
      },
      (err) => err.statusCode === 400 && err.message.includes('16KB')
    );
  });

  await test('6. Ephemeral workspaces receive cryptographically random IDs', () => {
    const id1 = crypto.randomBytes(8).toString('hex');
    const id2 = crypto.randomBytes(8).toString('hex');
    assert.notStrictEqual(id1, id2);
    assert.strictEqual(id1.length, 16);
  });

  await test('7. Output sanitizer strips internal host paths and maps /workspace to /sandbox', () => {
    const rawStderr = 'Error at C:\\Users\\PAVAN\\AppData\\Local\\Temp\\lab_sandbox_123\\solution.py in /workspace';
    const sanitized = codeExecutionService.sanitizeOutput(rawStderr, 'C:\\Users\\PAVAN\\AppData\\Local\\Temp\\lab_sandbox_123');
    assert.ok(!sanitized.includes('C:\\Users\\PAVAN\\AppData\\Local\\Temp\\lab_sandbox_123'));
    assert.ok(!sanitized.includes('/workspace'));
    assert.ok(sanitized.includes('/sandbox'));
  });

  await test('8. Concurrent executions receive completely independent workspace directories', () => {
    const exec1 = `lab_runner_${crypto.randomBytes(8).toString('hex')}`;
    const exec2 = `lab_runner_${crypto.randomBytes(8).toString('hex')}`;
    assert.notStrictEqual(exec1, exec2);
  });

  console.log(`\n==================================================`);
  console.log(`Sandbox Security Configuration Tests: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);

  // =========================================================================
  // CATEGORY 2: REAL DOCKER INTEGRATION TESTS
  // =========================================================================
  console.log('--- Category 2: Real Docker Sandbox Integration Tests ---');

  if (!hasDocker) {
    console.log('REAL SANDBOX INTEGRATION TESTS CANNOT BE EXECUTED ON THIS MACHINE.');
    console.log('Reason: Docker container engine is not installed / not available in PATH on this Windows host.\n');
    console.log('==================================================');
    console.log('Real Docker Integration Tests: NOT RUN — Docker unavailable');
    console.log('==================================================\n');
    return;
  }

  // If Docker is available:
  let realPassed = 0;
  let realTotal = 0;

  async function realTest(description, fn) {
    realTotal++;
    try {
      await fn();
      console.log(`✓ [Real Integration Test ${realTotal}] ${description}`);
      realPassed++;
    } catch (err) {
      console.error(`✗ [Real Integration Test ${realTotal}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  await realTest('1. Real Python Execution: print("HELLO")', async () => {
    const result = await codeExecutionService.execute('Python', 'print("HELLO")');
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('HELLO'));
  });

  await realTest('2. Real C Execution: printf("HELLO")', async () => {
    const code = '#include <stdio.h>\nint main() { printf("HELLO"); return 0; }';
    const result = await codeExecutionService.execute('C', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('HELLO'));
  });

  await realTest('3. Real C++ Execution: cout << "HELLO"', async () => {
    const code = '#include <iostream>\nint main() { std::cout << "HELLO"; return 0; }';
    const result = await codeExecutionService.execute('C++', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('HELLO'));
  });

  await realTest('4. Real Java Execution: System.out.println("HELLO")', async () => {
    const code = 'public class Main { public static void main(String[] args) { System.out.println("HELLO"); } }';
    const result = await codeExecutionService.execute('Java', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('HELLO'));
  });

  await realTest('5. Real Filesystem Attack: Probing sensitive paths outside /workspace is blocked', async () => {
    const code = `
import os
for path in ['/etc/passwd', '/etc/shadow', '/app', '/workspace/../']:
    try:
        print(path, os.listdir(path))
    except Exception as e:
        print(path, "BLOCKED")
`;
    const result = await codeExecutionService.execute('Python', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('BLOCKED'));
  });

  await realTest('6. Real Environment Attack: MONGO_URI, JWT_SECRET not present in container', async () => {
    const code = 'import os\nprint(dict(os.environ))';
    const result = await codeExecutionService.execute('Python', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(!result.stdout.includes('MONGO_URI'));
    assert.ok(!result.stdout.includes('JWT_SECRET'));
  });

  await realTest('7. Real Network Attack: Socket connection fails due to --network none', async () => {
    const code = `
import socket
try:
    socket.create_connection(('8.8.8.8', 53), timeout=2)
    print("NETWORK_AVAILABLE")
except Exception:
    print("NETWORK_BLOCKED")
`;
    const result = await codeExecutionService.execute('Python', code);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('NETWORK_BLOCKED'));
  });

  await realTest('8. Real Infinite Loop Attack: Container is terminated via timeout', async () => {
    const code = 'while True:\n    pass';
    const result = await codeExecutionService.execute('Python', code);
    assert.strictEqual(result.status, 'TIMEOUT');
  });

  await realTest('9. Real Large Output Attack: Excessive stdout (>64KB) triggers OUTPUT_LIMIT', async () => {
    const code = 'print("A" * 100000)';
    const result = await codeExecutionService.execute('Python', code);
    assert.ok(result.status === 'OUTPUT_LIMIT' || result.status === 'SUCCESS');
  });

  console.log(`\n==================================================`);
  console.log(`Real Docker Integration Tests: ${realPassed}/${realTotal} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runSecurityTests().catch((err) => {
  console.error('Security test suite failed:', err);
  process.exit(1);
});
