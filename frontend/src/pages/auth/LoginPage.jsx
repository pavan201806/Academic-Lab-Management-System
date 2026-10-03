import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, setError } = useAuth();

  const [rollNumber, setRollNumber] = useState('202301001');
  const [password, setPassword] = useState('TempStudent#2024');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('student');
  const [formError, setFormError] = useState('');

  const handleRoleSelect = (role) => {
    setActiveRoleTab(role);
    setError(null);
    setFormError('');
    if (role === 'student') {
      setRollNumber('202301001');
      setPassword('TempStudent#2024');
    } else if (role === 'teacher') {
      setRollNumber('PROFVANCE');
      setPassword('TeacherPass123!');
    } else if (role === 'admin') {
      setRollNumber('ADMIN01');
      setPassword('AdminPass123!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setError(null);

    const cleanRoll = rollNumber.trim();
    if (!cleanRoll) {
      setFormError('Please enter your roll number or username.');
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(cleanRoll)) {
      setFormError('Roll number / username must contain only letters and numbers without spaces or special characters.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(cleanRoll, password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.user.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        const defaultPath =
          result.user?.role === 'ADMIN_HOD'
            ? '/admin/dashboard'
            : result.user?.role === 'TEACHER'
            ? '/teacher/labs'
            : result.user?.role === 'STUDENT'
            ? '/student/labs'
            : '/dashboard';
        const from = location.state?.from?.pathname || defaultPath;
        navigate(from, { replace: true });
      }
    }
  };

  const activeError = formError || authError;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Institutional Cyber Defense Notice */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--color-surface-hover)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--color-primary)' }}>Academic Security Notice:</strong> First-time users
            logging in with a temporary password will be prompted to create a secure personal password before accessing
            lab curriculum.
          </p>
        </div>
        <span className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>
          TLS 1.3 SECURED
        </span>
      </div>

      {/* Main Login Card Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch'
        }}
      >
        {/* Login Form Container */}
        <section
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}
              >
                ⚗
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  Portal Authentication
                </h2>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Academic Lab Management System
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Enter your alphanumeric institutional credentials to access your assigned laboratory workbenches.
            </p>

            {/* Role Quick Selector Tabs */}
            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                backgroundColor: 'var(--color-canvas)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                gap: '0.25rem'
              }}
            >
              <button
                type="button"
                onClick={() => handleRoleSelect('student')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeRoleTab === 'student' ? 'var(--color-surface)' : 'transparent',
                  color: activeRoleTab === 'student' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  boxShadow: activeRoleTab === 'student' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('teacher')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeRoleTab === 'teacher' ? 'var(--color-surface)' : 'transparent',
                  color: activeRoleTab === 'teacher' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  boxShadow: activeRoleTab === 'teacher' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                👨‍🏫 Faculty
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeRoleTab === 'admin' ? 'var(--color-surface)' : 'transparent',
                  color: activeRoleTab === 'admin' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  boxShadow: activeRoleTab === 'admin' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                🏛️ Admin/HOD
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Role preset: <strong style={{ color: 'var(--color-primary)' }}>{activeRoleTab.toUpperCase()}</strong>
              </span>
            </div>
          </div>

          {/* Form Body */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {/* Error Alert Box */}
            {activeError && (
              <div
                style={{
                  padding: '0.875rem 1rem',
                  backgroundColor: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>⚠️</span>
                <div>
                  <strong>Authentication Failed:</strong> {activeError}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {/* Roll Number / Username Field */}
              <div>
                <label
                  htmlFor="rollNumber"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  Roll Number / Username <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="rollNumber"
                    name="rollNumber"
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 23341A4504, 504, or PROFVANCE"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-family-body)',
                      border: '1px solid var(--color-border-input)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                  Alphanumeric identifier (letters and numbers only)
                </p>
              </div>

              {/* Password Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    Password <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-family-body)',
                      border: '1px solid var(--color-border-input)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9375rem',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  Remember me on this workstation
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9375rem',
                  marginTop: '0.5rem'
                }}
              >
                {isSubmitting ? 'Authenticating credentials...' : 'Sign In to Portal'}
              </button>
            </form>

            {/* Compliance Footer */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <span>🔒</span>
              <span>
                <strong style={{ color: 'var(--color-text-primary)' }}>Compliance notice:</strong> Authorized academic
                and research personnel only. All access and activity are audited.
              </span>
            </div>
          </div>
        </section>

        {/* Informational Guidance Panel */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span> First-Time Login Guidelines
            </h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                <strong>1. Temporary Passwords:</strong> Accounts created by administrators are assigned temporary passwords that require mandatory replacement upon first sign in.
              </p>
              <p>
                <strong>2. Alphanumeric IDs:</strong> Student roll numbers (e.g., <code style={{ color: 'var(--color-primary)' }}>23341A4504</code>) and faculty IDs are unique and case-insensitive.
              </p>
              <p>
                <strong>3. Password Standards:</strong> New passwords must be at least 8 characters long with uppercase letters, numbers, and special symbols.
              </p>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <h4 style={{ fontSize: '0.9375rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              Need Help with Your Account?
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              If you have forgotten your password or your account is deactivated, contact your department HOD or lab administrator to receive an onboarding reset.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
