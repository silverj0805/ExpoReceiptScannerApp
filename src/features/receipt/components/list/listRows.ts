import type { ReceiptGroup } from '../../utils/groupReceiptsByDate';

const SKELETON_GROUP_COUNT = 3;

type SkeletonRow = { skeletonKey: number };

export type ListRow = ReceiptGroup | SkeletonRow;

export const SKELETON_ROWS: SkeletonRow[] = Array.from(
  { length: SKELETON_GROUP_COUNT },
  (_, i) => ({ skeletonKey: i }),
);

export const isSkeletonRow = (row: ListRow): row is SkeletonRow =>
  'skeletonKey' in row;
