import React, { createContext, useContext, useState } from 'react';

const ParentContext = createContext();

export function ParentProvider({ children }) {
  const [parentData, setParentData] = useState(null);

  return (
    <ParentContext.Provider value={{ parentData, setParentData }}>
      {children}
    </ParentContext.Provider>
  );
}

export function useParent() {
  return useContext(ParentContext);
}
