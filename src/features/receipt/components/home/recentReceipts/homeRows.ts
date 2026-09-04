import type { Receipt } from '@/features/receipt/api/types/receipt';

const SKELETON_ROW_COUNT = 4;

type SkeletonRow = { skeletonKey: number };

export type HomeRow = Receipt | SkeletonRow;

export const SKELETON_ROWS: SkeletonRow[] = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, i) => ({ skeletonKey: i }),
);

export const isSkeletonRow = (row: HomeRow): row is SkeletonRow =>
  'skeletonKey' in row;
