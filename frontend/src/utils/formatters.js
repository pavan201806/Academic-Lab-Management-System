/**
 * General helper formatters
 */

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};
