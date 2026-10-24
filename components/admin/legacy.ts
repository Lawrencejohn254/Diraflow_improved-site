// Bridge to the original admin page running in the shell's frame (same origin, so we can call its functions).
// Remove this file when the last tab has moved to React.
export type LegacyWin = Window & {
  switchTab?: (id: string) => void; markActivity?: () => void; doLogout?: (reason?: string) => Promise<void>;
  toggleClock?: () => void; toggleBreak?: () => void; applyTheme?: (t: string) => void;
  openProfileModal?: () => void; toggleNotifPanel?: () => void;
};

export function legacyWin(frame: HTMLIFrameElement | null): LegacyWin | null {
  try { return (frame && frame.contentWindow) as LegacyWin | null; } catch { return null; }
}

/** True once the original page has finished signing in and built its UI. */
export function legacyReady(frame: HTMLIFrameElement | null): boolean {
  const w = legacyWin(frame);
  try {
    const shell = w?.document.getElementById('admin-shell');
    return !!w && typeof w.switchTab === 'function' && !!shell && w.getComputedStyle(shell).display !== 'none';
  } catch { return false; }
}
