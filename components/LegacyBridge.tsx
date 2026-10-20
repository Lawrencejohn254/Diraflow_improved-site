'use client';
import { useEffect } from 'react';
import { installLegacyBridge } from '@/lib/legacy-bridge';

export default function LegacyBridge() {
  useEffect(() => { installLegacyBridge(); }, []);
  return null;
}
