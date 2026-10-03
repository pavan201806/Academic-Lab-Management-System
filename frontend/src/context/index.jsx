import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [appInfo] = useState({
    name: 'Academic Lab Management System',
    phase: 'Phase 0 — Foundation'
  });

  return (
    <AppContext.Provider value={{ appInfo }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
