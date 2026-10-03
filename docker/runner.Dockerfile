# =============================================================================
# Academic Lab Management System - Isolated Code Runner Image
# =============================================================================
# This image provides a deterministic, minimal execution environment containing
# only the approved programming language runtimes (Python 3, OpenJDK 21, GCC/G++).
#
# Security Hardening:
# - Runs as non-root user (runner: 1000:1000)
# - Stripped of unnecessary packages, network tools, and daemons
# - Ephemeral workspace mounted at /workspace
# =============================================================================

FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install only the required language runtimes and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-minimal \
    openjdk-21-jdk-headless \
    gcc \
    g++ \
    make \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged runner user and group
RUN groupadd -g 1000 runner && \
    useradd -u 1000 -g runner -m -s /bin/bash runner

# Prepare workspace directory with correct permissions
RUN mkdir -p /workspace && chown -R runner:runner /workspace

# Set default execution user and working directory
USER runner
WORKDIR /workspace

# Safe runtime defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"
