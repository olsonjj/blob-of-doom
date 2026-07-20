export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const MODERATION_CATEGORIES: { key: string; label: string }[] = [
  { key: 'nudity', label: 'Nudity' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'alcohol', label: 'Alcohol' },
  { key: 'drugs', label: 'Drugs' },
];
