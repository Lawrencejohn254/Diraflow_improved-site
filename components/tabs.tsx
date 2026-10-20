'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

const TabsCtx = createContext<{ active: string; set: (id: string) => void }>({ active: '', set: () => {} });

export function Tabs({ initial, children }: { initial: string; children: ReactNode }) {
  const [active, set] = useState(initial);
  return <TabsCtx.Provider value={{ active, set }}>{children}</TabsCtx.Provider>;
}

export function TabButton({ id, children }: { id: string; children: ReactNode }) {
  const { active, set } = useContext(TabsCtx);
  return <button type="button" className={`form-tab${active === id ? ' active' : ''}`} onClick={() => set(id)}>{children}</button>;
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { active } = useContext(TabsCtx);
  return <div id={`tab-${id}`} className={`form-panel${active === id ? ' active' : ''}`}>{children}</div>;
}
