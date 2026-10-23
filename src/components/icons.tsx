const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconSchedule = () => (<svg {...base}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>);
export const IconGuide = () => (<svg {...base}><rect x="3.5" y="4" width="17" height="12" rx="3" /><path d="M8 20h8M12 16v4" /></svg>);
export const IconStats = () => (<svg {...base}><path d="M5 20V11M12 20V4M19 20v-6" /></svg>);
export const IconBell = () => (<svg {...base}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 21h4" /></svg>);
export const IconWifi = () => (<svg {...base} width={16} height={16} strokeWidth={2}><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.2" r=".6" /></svg>);
export const IconRefresh = () => (<svg {...base}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>);
export const IconPlay = ({ size = 20 }: { size?: number }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6z" /></svg>);
export const IconStop = () => (<svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="5" y="5" width="14" height="14" rx="3" /></svg>);
