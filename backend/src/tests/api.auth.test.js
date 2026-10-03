const assert = require('assert');
const http = require('http');
const app = require('../app');
const { generateToken } = require('../utils/token');

async function testApiEndpoints() {
  console.log('--- Running API HTTP Integration Tests ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Health Check
    console.log('1. Testing GET /api/health...');
    const resHealth = await fetch(`${baseUrl}/health`);
    const dataHealth = await resHealth.json();
    assert.strictEqual(resHealth.status, 200);
    assert.strictEqual(dataHealth.success, true);
    assert.strictEqual(dataHealth.data.status, 'healthy');
    console.log('✓ GET /api/health passed.');

    // 2. Login Validation Failures
    console.log('2. Testing POST /api/auth/login validation...');

    // Missing fields
    const resEmpty = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const dataEmpty = await resEmpty.json();
    assert.strictEqual(resEmpty.status, 400);
    assert.strictEqual(dataEmpty.success, false);
    assert.strictEqual(dataEmpty.message.includes('required'), true);

    // Non-alphanumeric roll number (symbols)
    const resInvalidRoll = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNumber: '23-341A@504', password: 'password123' })
    });
    const dataInvalidRoll = await resInvalidRoll.json();
    assert.strictEqual(resInvalidRoll.status, 400);
    assert.strictEqual(dataInvalidRoll.success, false);
    assert.strictEqual(dataInvalidRoll.message.includes('alphanumeric'), true);

    // Non-alphanumeric roll number (spaces)
    const resSpaceRoll = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNumber: '23 341A504', password: 'password123' })
    });
    const dataSpaceRoll = await resSpaceRoll.json();
    assert.strictEqual(resSpaceRoll.status, 400);
    assert.strictEqual(dataSpaceRoll.success, false);

    console.log('✓ POST /api/auth/login validation passed.');

    // 3. Unauthenticated requests to protected endpoints
    console.log('3. Testing Protected Endpoints without JWT...');
    const resMeNoAuth = await fetch(`${baseUrl}/auth/me`);
    const dataMeNoAuth = await resMeNoAuth.json();
    assert.strictEqual(resMeNoAuth.status, 401);
    assert.strictEqual(dataMeNoAuth.success, false);
    assert.strictEqual(dataMeNoAuth.message.includes('missing'), true);

    const resChangeNoAuth = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'old',
        newPassword: 'new',
        confirmPassword: 'new'
      })
    });
    const dataChangeNoAuth = await resChangeNoAuth.json();
    assert.strictEqual(resChangeNoAuth.status, 401);
    assert.strictEqual(dataChangeNoAuth.success, false);

    console.log('✓ Unauthenticated requests properly rejected with 401.');

    // 4. Invalid token rejection
    console.log('4. Testing Invalid JWT Token...');
    const resBadToken = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' }
    });
    const dataBadToken = await resBadToken.json();
    assert.strictEqual(resBadToken.status, 401);
    assert.strictEqual(dataBadToken.success, false);
    assert.strictEqual(dataBadToken.message.includes('Invalid authentication token'), true);
    console.log('✓ Invalid token properly rejected with 401.');

    // 5. Logout endpoint
    console.log('5. Testing POST /api/auth/logout...');
    const resLogout = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    const dataLogout = await resLogout.json();
    assert.strictEqual(resLogout.status, 200);
    assert.strictEqual(dataLogout.success, true);
    console.log('✓ POST /api/auth/logout passed.');

    console.log('--- ALL API HTTP INTEGRATION TESTS PASSED SUCCESSFULLY ---');
  } finally {
    server.close();
  }
}

testApiEndpoints().catch((err) => {
  console.error('API Test failure:', err);
  process.exit(1);
});
