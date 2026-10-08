import React, { useRef } from 'react';

const CodeEditor = ({
  value,
  onChange,
  language,
  readOnly = false,
  height = '420px',
  placeholder = '// Write your solution here...',
  enableMalpracticeProtection = false,
  onMalpracticeAttempt = null
}) => {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = value ? value.split('\n') : [''];
  const lineCount = Math.max(lines.length, 1);

  // Sync scroll between line numbers gutter and textarea
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Trigger malpractice attempt notification & callback safely
  const triggerMalpractice = (eventType, message) => {
    if (enableMalpracticeProtection && !readOnly && onMalpracticeAttempt) {
      onMalpracticeAttempt(eventType, message);
    }
  };

  // Copy event handler
  const handleCopy = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      triggerMalpractice('COPY_ATTEMPT', 'Copying code is disabled during lab sessions.');
    }
  };

  // Cut event handler
  const handleCut = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      triggerMalpractice('CUT_ATTEMPT', 'Cutting code is disabled during lab sessions.');
    }
  };

  // Paste event handler
  const handlePaste = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      triggerMalpractice('PASTE_ATTEMPT', 'Pasting code is disabled during lab sessions.');
    }
  };

  // Context menu (right-click) handler
  const handleContextMenu = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      triggerMalpractice('CONTEXT_MENU_ATTEMPT', 'Context menu is disabled in the code editor.');
    }
  };

  // Drag & drop handlers
  const handleDragEnter = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'none';
      }
    }
  };

  const handleDragOver = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'none';
      }
    }
  };

  const handleDrop = (e) => {
    if (enableMalpracticeProtection && !readOnly) {
      e.preventDefault();
      triggerMalpractice('DRAG_DROP_ATTEMPT', 'Dragging and dropping content into the editor is disabled.');
    }
  };

  // Handle Tab key, automatic indentation, and shortcut intercepts
  const handleKeyDown = (e) => {
    if (readOnly) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';

    // Malpractice prevention keyboard shortcuts
    if (enableMalpracticeProtection && isCtrlOrMeta) {
      if (key === 'c') {
        e.preventDefault();
        triggerMalpractice('COPY_ATTEMPT', 'Copying is disabled during lab sessions.');
        return;
      }
      if (key === 'v') {
        e.preventDefault();
        triggerMalpractice('PASTE_ATTEMPT', 'Pasting is disabled during lab sessions.');
        return;
      }
      if (key === 'x') {
        e.preventDefault();
        triggerMalpractice('CUT_ATTEMPT', 'Cutting is disabled during lab sessions.');
        return;
      }
      // Allowed shortcuts continue normally: Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+F, Ctrl+S, etc.
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;

      // Insert 2 spaces for tab
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.25)',
        fontFamily: 'var(--font-family-mono, "JetBrains Mono", monospace)'
      }}
    >
      {/* Editor Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          fontSize: '0.75rem',
          color: '#94A3B8'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#38BDF8'
            }}
          />
          <span style={{ fontWeight: 600, color: '#E2E8F0', letterSpacing: '0.05em' }}>
            SOURCE EDITOR &bull; {language ? language.toUpperCase() : 'CODE'}
          </span>
          {readOnly && (
            <span
              style={{
                backgroundColor: '#334155',
                color: '#CBD5E1',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.6875rem'
              }}
            >
              READ ONLY
            </span>
          )}
          {enableMalpracticeProtection && !readOnly && (
            <span
              title="Malpractice prevention active: Copy, paste, cut, and right-click are restricted."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.6875rem',
                fontWeight: 600
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>🛡️</span>
              Lab Integrity Monitoring Active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{lineCount} lines</span>
          <span>{value ? (new Blob([value]).size / 1024).toFixed(1) : 0} KB / 64 KB</span>
        </div>
      </div>

      {/* Editor Body: Gutter + Textarea */}
      <div style={{ display: 'flex', position: 'relative', height, overflow: 'hidden' }}>
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          style={{
            width: '48px',
            padding: '0.75rem 0.5rem',
            textAlign: 'right',
            backgroundColor: '#0F172A',
            borderRight: '1px solid #1E293B',
            color: '#475569',
            userSelect: 'none',
            fontSize: '0.8125rem',
            lineHeight: '1.5rem',
            overflowY: 'hidden'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onContextMenu={handleContextMenu}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            margin: 0,
            border: 'none',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'transparent',
            color: '#F8FAFC',
            fontSize: '0.8125rem',
            lineHeight: '1.5rem',
            fontFamily: 'inherit',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            overflowY: 'auto',
            tabSize: 2
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
