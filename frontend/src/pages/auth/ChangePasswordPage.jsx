import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, changePassword, logout, error: authError, setError } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Live password validation checklist
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_~`\-+=\[\]\\;/]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Calculate live entropy score (0 - 100)
  let strengthScore = 0;
  if (hasMinLength) strengthScore += 25;
  if (hasUppercase) strengthScore += 25;
  if (hasNumber) strengthScore += 25;
  if (hasSpecial) strengthScore += 25;

  const getStrengthMeta = () => {
    if (strengthScore <= 25) {
      return { label: 'Weak (25% Complexity)', color: 'var(--color-error)' };
    } else if (strengthScore <= 50) {
      return { label: 'Fair (50% Complexity)', color: 'var(--color-warning)' };
    } else if (strengthScore <= 75) {
      return { label: 'Good (75% Complexity)', color: 'var(--color-info)' };
    }
    return { label: 'Strong (100% Verified)', color: 'var(--color-success)' };
  };

  const strengthMeta = getStrengthMeta();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setError(null);
    setSuccessMessage('');

    if (!currentPassword) {
      setFormError('Please enter your current temporary password.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      setFormError('Please satisfy all password complexity standards listed below.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setFormError('New password cannot be the same as your current temporary password.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('Password successfully updated! Redirecting to laboratory workbench...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const activeError = formError || authError;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Main Security Gate Card */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-hover)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}
              >
                🔐
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  Create Your New Password
                </h2>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                  First-Time Login Security Gate
                </span>
              </div>
            </div>
            <span className="badge badge-error">Enforced Policy</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            For academic integrity and security compliance, you must replace your assigned temporary password before accessing laboratory equipment, experiment curriculums, and submission records.
          </p>

          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div style={{ flex: 1, fontSize: '0.8125rem' }}>
              <strong style={{ color: 'var(--color-primary)', display: 'block' }}>
                Account: {user?.name} ({user?.rollNumber}) &mdash; Role: {user?.role}
              </strong>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Access to code execution, submissions, and lab logs is restricted until this setup is complete.
              </span>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div
            style={{
              margin: '1.5rem 2rem 0',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>✅</span>
            <div>
              <strong style={{ display: 'block' }}>{successMessage}</strong>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                <strong>Update Failed:</strong> {activeError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Current Temporary Password */}
            <div>
              <label
                htmlFor="currentPassword"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  color: 'var(--color-text-primary)'
                }}
              >
                Current Temporary Password <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password from administrator"
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
                  onClick={() => setShowCurrent(!showCurrent)}
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
                  {showCurrent ? '👁️' : '🔒'}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Initial onboarding passphrase provided by department admin
              </p>
            </div>

            {/* New Password & Entropy Gauge */}
            <div>
              <label
                htmlFor="newPassword"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  color: 'var(--color-text-primary)'
                }}
              >
                New Password <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong new passphrase"
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
                  onClick={() => setShowNew(!showNew)}
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
                  {showNew ? '👁️' : '🔒'}
                </button>
              </div>

              {/* Entropy meter */}
              {newPassword && (
                <div style={{ marginTop: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Entropy &amp; Complexity:</span>
                    <strong style={{ color: strengthMeta.color }}>{strengthMeta.label}</strong>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${strengthScore}%`,
                        backgroundColor: strengthMeta.color,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  color: 'var(--color-text-primary)'
                }}
              >
                Confirm New Password <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-family-body)',
                    border: `1px solid ${
                      confirmPassword && !passwordsMatch
                        ? 'var(--color-error)'
                        : confirmPassword && passwordsMatch
                        ? 'var(--color-success)'
                        : 'var(--color-border-input)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
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
                  {showConfirm ? '👁️' : '🔒'}
                </button>
              </div>
              {confirmPassword && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    color: passwordsMatch ? 'var(--color-success)' : 'var(--color-error)',
                    margin: 0
                  }}
                >
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Collegiate Password Standards Checklist */}
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)'
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  marginBottom: '0.5rem'
                }}
              >
                Collegiate Password Standards Checklist
              </span>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.375rem',
                  fontSize: '0.8125rem'
                }}
              >
                <li style={{ color: hasMinLength ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {hasMinLength ? '✅' : '⚪'} At least 8 characters
                </li>
                <li style={{ color: hasUppercase ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {hasUppercase ? '✅' : '⚪'} At least 1 uppercase letter (A-Z)
                </li>
                <li style={{ color: hasNumber ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {hasNumber ? '✅' : '⚪'} At least 1 numerical digit (0-9)
                </li>
                <li style={{ color: hasSpecial ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {hasSpecial ? '✅' : '⚪'} At least 1 special symbol (!@#$%^&*)
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '220px', padding: '0.75rem 1.25rem' }}
              >
                {isSubmitting ? 'Updating credentials...' : 'Update Password & Enter Portal'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.25rem' }}
              >
                Cancel / Return to Login
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ChangePasswordPage;
