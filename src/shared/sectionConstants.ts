export const PAGE_SIZE = 50;

export function sectionRangeLabel(sectionIndex: number, total: number): string {
  const start = sectionIndex * PAGE_SIZE + 1;
  const end = Math.min((sectionIndex + 1) * PAGE_SIZE, total);
  return `${start}–${end}`;
}

export function sectionCountFromTotal(total: number): number {
  return total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
}
