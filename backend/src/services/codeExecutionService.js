const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const AppError = require('../utils/appError');

class CodeExecutionService {
  constructor() {
    this.TIMEOUT_MS = 5000; // 5 seconds hard execution timeout
    this.MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB max stdout/stderr buffer
    this.MAX_SOURCE_BYTES = 64 * 1024; // 64 KB max source code
    this.MAX_STDIN_BYTES = 16 * 1024; // 16 KB max standard input
    this.DOCKER_IMAGE = process.env.RUNNER_DOCKER_IMAGE || 'academic-lab-runner:latest';
    this.MEMORY_LIMIT = '256m';
    this.CPU_LIMIT = '1.0';
    this.PIDS_LIMIT = '64';
  }

  /**
   * Checks whether the Docker daemon is available in the current environment.
   * @returns {boolean}
   */
  isDockerAvailable() {
    try {
      execSync('docker info', { stdio: 'pipe', timeout: 2000 });
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Cleans internal file paths from compiler / runtime stderr outputs
   */
  sanitizeOutput(text, tempDir) {
    if (!text || typeof text !== 'string') return '';
    const escaped = tempDir.replace(/\\/g, '\\\\');
    const regex = new RegExp(escaped, 'g');
    let sanitized = text.replace(regex, '/sandbox');
    sanitized = sanitized.replace(/\/workspace/g, '/sandbox');
    return sanitized;
  }

  /**
   * Spawns an isolated Docker container with strict resource, network, and security constraints.
   * @param {string} containerName
   * @param {string} hostDir
   * @param {string[]} cmdArgs
   * @param {string} stdinInput
   * @returns {Promise<object>}
   */
  runContainerProcess(containerName, hostDir, cmdArgs, stdinInput = '') {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let isKilled = false;
      let outputLimitExceeded = false;

      // Construct Docker run argument array (zero shell interpolation)
      // Converts Windows backslashes to forward slashes for Docker volume mount
      const normalizedHostDir = path.resolve(hostDir).replace(/\\/g, '/');

      const dockerArgs = [
        'run',
        '--rm',
        '--name', containerName,
        '--network', 'none',
        '--user', '1000:1000',
        '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges',
        '--cpus', this.CPU_LIMIT,
        '--memory', this.MEMORY_LIMIT,
        '--pids-limit', this.PIDS_LIMIT,
        '-v', `${normalizedHostDir}:/workspace:rw`,
        '-w', '/workspace',
        this.DOCKER_IMAGE,
        ...cmdArgs
      ];

      let child;
      try {
        child = spawn('docker', dockerArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { PATH: process.env.PATH || '' }
        });
      } catch (err) {
        return resolve({
          stdout: '',
          stderr: `Failed to spawn Docker container process: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          status: 'EXECUTION_ERROR'
        });
      }

      // Hard timeout timer
      const timer = setTimeout(() => {
        isKilled = true;
        try {
          child.kill('SIGKILL');
        } catch (_) {}
        // Ensure docker container is stopped/killed
        try {
          spawn('docker', ['kill', containerName], { stdio: 'ignore' });
        } catch (_) {}
      }, this.TIMEOUT_MS);

      if (stdinInput && child.stdin) {
        try {
          child.stdin.write(stdinInput);
          child.stdin.end();
        } catch (_) {}
      } else if (child.stdin) {
        try {
          child.stdin.end();
        } catch (_) {}
      }

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          if (stdout.length + data.length > this.MAX_OUTPUT_BYTES) {
            outputLimitExceeded = true;
            stdout += data.toString().substring(0, this.MAX_OUTPUT_BYTES - stdout.length);
            try {
              child.kill('SIGKILL');
            } catch (_) {}
            try {
              spawn('docker', ['kill', containerName], { stdio: 'ignore' });
            } catch (_) {}
          } else {
            stdout += data.toString();
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          if (stderr.length + data.length > this.MAX_OUTPUT_BYTES) {
            outputLimitExceeded = true;
            stderr += data.toString().substring(0, this.MAX_OUTPUT_BYTES - stderr.length);
            try {
              child.kill('SIGKILL');
            } catch (_) {}
            try {
              spawn('docker', ['kill', containerName], { stdio: 'ignore' });
            } catch (_) {}
          } else {
            stderr += data.toString();
          }
        });
      }

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || `Docker execution error: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          status: 'EXECUTION_ERROR'
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const executionTimeMs = Date.now() - startTime;

        if (isKilled) {
          return resolve({
            stdout,
            stderr: stderr + '\nExecution timed out (Time Limit Exceeded: 5000ms)',
            exitCode: 124,
            executionTimeMs,
            status: 'TIMEOUT'
          });
        }

        if (outputLimitExceeded) {
          return resolve({
            stdout,
            stderr: stderr + '\nStandard output size limit exceeded (Max 64KB)',
            exitCode: 1,
            executionTimeMs,
            status: 'OUTPUT_LIMIT'
          });
        }

        if (code === 0) {
          return resolve({
            stdout,
            stderr,
            exitCode: 0,
            executionTimeMs,
            status: 'SUCCESS'
          });
        }

        // Docker returns 137 when killed due to OOM (Out of memory)
        if (code === 137) {
          return resolve({
            stdout,
            stderr: stderr + '\nMemory limit exceeded (Process terminated by container OOM killer)',
            exitCode: 137,
            executionTimeMs,
            status: 'RUNTIME_ERROR'
          });
        }

        return resolve({
          stdout,
          stderr: stderr || `Process exited with code ${code}`,
          exitCode: code || 1,
          executionTimeMs,
          status: 'RUNTIME_ERROR'
        });
      });
    });
  }

  /**
   * Main entry point: Safely executes student source code inside an ephemeral isolated Docker container.
   * @param {'C'|'C++'|'Java'|'Python'} language
   * @param {string} sourceCode
   * @param {string} stdin
   * @returns {Promise<object>} Execution result
   */
  async execute(language, sourceCode, stdin = '') {
    if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
      throw new AppError('Source code cannot be empty', 400);
    }

    if (Buffer.byteLength(sourceCode, 'utf8') > this.MAX_SOURCE_BYTES) {
      throw new AppError('Source code exceeds maximum allowed size of 64KB', 400);
    }

    if (stdin && Buffer.byteLength(stdin, 'utf8') > this.MAX_STDIN_BYTES) {
      throw new AppError('Standard input exceeds maximum allowed size of 16KB', 400);
    }

    const executionId = crypto.randomBytes(8).toString('hex');
    const containerName = `lab_runner_${executionId}`;
    const tempDir = path.join(os.tmpdir(), `lab_sandbox_${executionId}`);

    try {
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Check if Docker runtime is present
      if (!this.isDockerAvailable()) {
        return {
          stdout: '',
          stderr: 'Docker container engine is not available on this host environment. Code execution requires an active Docker daemon with the "academic-lab-runner:latest" image.',
          exitCode: 1,
          executionTimeMs: 0,
          status: 'EXECUTION_ERROR'
        };
      }

      let result;

      switch (language) {
        case 'Python':
          result = await this.executePython(containerName, tempDir, sourceCode, stdin);
          break;

        case 'Java':
          result = await this.executeJava(containerName, tempDir, sourceCode, stdin);
          break;

        case 'C':
          result = await this.executeC(containerName, tempDir, sourceCode, stdin);
          break;

        case 'C++':
          result = await this.executeCpp(containerName, tempDir, sourceCode, stdin);
          break;

        default:
          throw new AppError(`Unsupported programming language: ${language}`, 400);
      }

      return {
        ...result,
        stdout: this.sanitizeOutput(result.stdout, tempDir),
        stderr: this.sanitizeOutput(result.stderr, tempDir)
      };
    } finally {
      // Ephemeral workspace teardown: guaranteed deletion
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }

  // --- Language Specific Handlers Inside Container ---

  async executePython(containerName, tempDir, sourceCode, stdin) {
    const filePath = path.join(tempDir, 'solution.py');
    await fs.promises.writeFile(filePath, sourceCode, 'utf8');

    return await this.runContainerProcess(
      containerName,
      tempDir,
      ['python3', '-u', 'solution.py'],
      stdin
    );
  }

  async executeJava(containerName, tempDir, sourceCode, stdin) {
    let className = 'Main';
    const match = sourceCode.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    if (match && match[1]) {
      className = match[1];
    }

    const javaFile = path.join(tempDir, `${className}.java`);
    await fs.promises.writeFile(javaFile, sourceCode, 'utf8');

    // 1. Compile step inside container
    const compileResult = await this.runContainerProcess(
      `${containerName}_compile`,
      tempDir,
      ['javac', `${className}.java`],
      ''
    );

    if (compileResult.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileResult.stderr || compileResult.stdout || 'Java compilation failed',
        exitCode: compileResult.exitCode,
        executionTimeMs: compileResult.executionTimeMs,
        status: 'COMPILE_ERROR'
      };
    }

    // 2. Execution step inside container with memory limits
    return await this.runContainerProcess(
      containerName,
      tempDir,
      ['java', '-Xmx256m', '-Xss16m', className],
      stdin
    );
  }

  async executeC(containerName, tempDir, sourceCode, stdin) {
    const srcFile = path.join(tempDir, 'solution.c');
    await fs.promises.writeFile(srcFile, sourceCode, 'utf8');

    // 1. Compile step inside container with gcc
    const compileResult = await this.runContainerProcess(
      `${containerName}_compile`,
      tempDir,
      ['gcc', '-O2', 'solution.c', '-o', 'solution'],
      ''
    );

    if (compileResult.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileResult.stderr || compileResult.stdout || 'C compilation failed',
        exitCode: compileResult.exitCode,
        executionTimeMs: compileResult.executionTimeMs,
        status: 'COMPILE_ERROR'
      };
    }

    // 2. Execute compiled ELF binary inside container
    return await this.runContainerProcess(
      containerName,
      tempDir,
      ['./solution'],
      stdin
    );
  }

  async executeCpp(containerName, tempDir, sourceCode, stdin) {
    const srcFile = path.join(tempDir, 'solution.cpp');
    await fs.promises.writeFile(srcFile, sourceCode, 'utf8');

    // 1. Compile step inside container with g++
    const compileResult = await this.runContainerProcess(
      `${containerName}_compile`,
      tempDir,
      ['g++', '-O2', 'solution.cpp', '-o', 'solution'],
      ''
    );

    if (compileResult.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileResult.stderr || compileResult.stdout || 'C++ compilation failed',
        exitCode: compileResult.exitCode,
        executionTimeMs: compileResult.executionTimeMs,
        status: 'COMPILE_ERROR'
      };
    }

    // 2. Execute compiled ELF binary inside container
    return await this.runContainerProcess(
      containerName,
      tempDir,
      ['./solution'],
      stdin
    );
  }
}

module.exports = new CodeExecutionService();
