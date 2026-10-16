const config = require('../config/env');
const DockerExecutionProvider = require('./providers/dockerExecutionProvider');
const Judge0ExecutionProvider = require('./providers/judge0ExecutionProvider');
const AppError = require('../utils/appError');

class CodeExecutionService {
  constructor() {
    this.TIMEOUT_MS = 5000; // 5 seconds hard execution timeout
    this.MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB max stdout/stderr buffer
    this.MAX_SOURCE_BYTES = 64 * 1024; // 64 KB max source code
    this.MAX_STDIN_BYTES = 16 * 1024; // 16 KB max standard input
    this.DOCKER_IMAGE = process.env.RUNNER_DOCKER_IMAGE || config.runnerDockerImage || 'academic-lab-runner:latest';
    this.MEMORY_LIMIT = '256m';
    this.CPU_LIMIT = '1.0';
    this.PIDS_LIMIT = '64';

    // Initialize execution engine providers
    this.dockerProvider = new DockerExecutionProvider({
      timeoutMs: this.TIMEOUT_MS,
      maxOutputBytes: this.MAX_OUTPUT_BYTES,
      maxSourceBytes: this.MAX_SOURCE_BYTES,
      maxStdinBytes: this.MAX_STDIN_BYTES,
      dockerImage: this.DOCKER_IMAGE,
      memoryLimit: this.MEMORY_LIMIT,
      cpuLimit: this.CPU_LIMIT,
      pidsLimit: this.PIDS_LIMIT
    });

    this.judge0Provider = new Judge0ExecutionProvider(config.judge0 || {});
  }

  /**
   * Resolves the active execution provider based on configuration or environment override
   * @returns {DockerExecutionProvider|Judge0ExecutionProvider}
   */
  getProvider() {
    const providerName = (process.env.EXECUTION_PROVIDER || config.executionProvider || 'judge0').toLowerCase();

    if (providerName === 'judge0') {
      return this.judge0Provider;
    }

    if (providerName === 'docker') {
      return this.dockerProvider;
    }

    throw new AppError(
      `Unsupported execution provider '${providerName}'. Valid options are 'judge0' or 'docker'.`,
      500
    );
  }

  /**
   * Allows programmatic provider switching (useful for targeted testing)
   * @param {'judge0'|'docker'} name
   */
  setProvider(name) {
    if (!['judge0', 'docker'].includes(name.toLowerCase())) {
      throw new AppError(`Cannot switch to unsupported provider '${name}'`, 400);
    }
    process.env.EXECUTION_PROVIDER = name.toLowerCase();
  }

  /**
   * Checks whether the Docker daemon is available in the current environment.
   * Delegated to dockerProvider for backward compatibility.
   * @returns {boolean}
   */
  isDockerAvailable() {
    return this.dockerProvider.isDockerAvailable();
  }

  /**
   * Cleans internal file paths from compiler / runtime stderr outputs.
   * Delegated to dockerProvider for backward compatibility.
   */
  sanitizeOutput(text, tempDir) {
    return this.dockerProvider.sanitizeOutput(text, tempDir);
  }

  /**
   * Runs a container process via dockerProvider.
   * Preserved for backward compatibility with Docker-specific security tests.
   */
  runContainerProcess(containerName, hostDir, cmdArgs, stdinInput = '') {
    return this.dockerProvider.runContainerProcess(containerName, hostDir, cmdArgs, stdinInput);
  }

  /**
   * Main entry point: Safely executes student source code using the configured provider.
   * @param {'C'|'C++'|'Java'|'Python'} language
   * @param {string} sourceCode
   * @param {string} stdin
   * @returns {Promise<object>} ExecutionResult
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

    const provider = this.getProvider();
    return await provider.execute(language, sourceCode, stdin);
  }
}

module.exports = new CodeExecutionService();
