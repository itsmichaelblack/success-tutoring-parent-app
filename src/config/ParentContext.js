import React, { createContext, useContext, useState, useCallback } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const ParentContext = createContext();

export function ParentProvider({ children: kids }) {
  const [parentData, setParentData] = useState(null);

  // Load children from Firestore sub-collection
  const loadChildren = useCallback(async (parentId) => {
    if (!parentId) return;
    try {
      const snap = await getDocs(collection(db, 'parents', parentId, 'children'));
      const childrenList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setParentData(prev => prev ? { ...prev, children: childrenList } : prev);
    } catch (e) {
      console.error('Failed to load children:', e);
    }
  }, []);

  // Add a child to the Firestore sub-collection
  const addChild = useCallback(async (childData) => {
    if (!parentData?.id) return;
    try {
      const ref = await addDoc(collection(db, 'parents', parentData.id, 'children'), {
        ...childData,
        createdAt: serverTimestamp(),
      });
      const newChild = { id: ref.id, ...childData };
      setParentData(prev => ({
        ...prev,
        children: [...(prev.children || []), newChild],
      }));
      return newChild;
    } catch (e) {
      console.error('Failed to add child:', e);
      throw e;
    }
  }, [parentData?.id]);

  return (
    <ParentContext.Provider value={{ parentData, setParentData, loadChildren, addChild }}>
      {kids}
    </ParentContext.Provider>
  );
}

export function useParent() {
  return useContext(ParentContext);
}
