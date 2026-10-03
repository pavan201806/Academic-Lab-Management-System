import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { labService } from '../../services/labService';
import { sectionService } from '../../services/sectionService';
import { userService } from '../../services/userService';
import { labAssignmentService } from '../../services/labAssignmentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    labsCount: 0,
    sectionsCount: 0,
    teachersCount: 0,
    studentsCount: 0,
    assignmentsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [labs, sections, teachers, students, assignments] = await Promise.all([
          labService.getLabs().catch(() => []),
          sectionService.getSections().catch(() => []),
          userService.getUsers({ role: 'TEACHER' }).catch(() => []),
          userService.getUsers({ role: 'STUDENT' }).catch(() => []),
          labAssignmentService.getAssignments().catch(() => [])
        ]);

        setStats({
          labsCount: labs.length,
          sectionsCount: sections.length,
          teachersCount: teachers.length,
          studentsCount: students.length,
          assignmentsCount: assignments.length
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LoadingSpinner size={32} text="Loading academic telemetry..." />
      </div>
    );
  }

  const statCards = [
    { label: 'Active Laboratories', count: stats.labsCount, icon: '⚗️', path: '/admin/labs', color: 'var(--color-primary)' },
    { label: 'Academic Sections', count: stats.sectionsCount, icon: '👥', path: '/admin/sections', color: 'var(--color-secondary)' },
    { label: 'Faculty Members', count: stats.teachersCount, icon: '👨‍🏫', path: '/admin/teachers', color: 'var(--color-tertiary)' },
    { label: 'Enrolled Students', count: stats.studentsCount, icon: '🎓', path: '/admin/students', color: '#7c3aed' },
    { label: 'Lab Assignments', count: stats.assignmentsCount, icon: '🔗', path: '/admin/assignments', color: 'var(--color-info)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
            Academic Structure &amp; Administration
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Centralized management console for laboratories, student cohorts, faculty assignments, and curriculum matrices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/admin/labs" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            + Manage Labs
          </Link>
          <Link to="/admin/assignments" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            + Assign Teachers
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.path}
            className="card"
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {card.label}
              </span>
              <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color }}>
                {card.count}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                View &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Academic Hierarchy Diagram Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0 }}>
          Academic Structure Architecture
        </h2>
        <div
          style={{
            backgroundColor: 'var(--color-surface-hover)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              1. Academic Units
            </span>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              <strong>Academic Year &amp; Semester:</strong> Groupings for institutional curriculum cycles.
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              2. Laboratory &amp; Cohort
            </span>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              <strong>Subject Lab &amp; Section:</strong> Connects practical labs with enrolled student groups.
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              3. Faculty In-Charge
            </span>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              <strong>Main &amp; Assistant Teachers:</strong> Single Main Teacher lead and assistant supervisors per lab section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
