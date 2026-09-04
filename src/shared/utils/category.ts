import type { CategoryId } from '@/features/receipt/api/types/category';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  bg: string;
  color: string;
}

const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'food', label: '식비', bg: '#FBE6DB', color: '#E35416' },
  { id: 'transit', label: '교통', bg: '#E1EEFB', color: '#1A79D6' },
  { id: 'shop', label: '쇼핑', bg: '#EDE3FA', color: '#7C2FE0' },
  { id: 'culture', label: '문화', bg: '#FBF1D2', color: '#C97E00' },
  { id: 'health', label: '건강', bg: '#DCF3EE', color: '#0B9A76' },
  { id: 'etc', label: '기타', bg: '#ECEAE6', color: '#6A5F52' },
];

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map(
  category => category.id,
);

const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(category => [category.id, category]),
) as Record<CategoryId, CategoryInfo>;

const FALLBACK = CATEGORY_MAP.etc;

export function getCategoryInfo(id: string): CategoryInfo {
  return CATEGORY_MAP[id as CategoryId] ?? FALLBACK;
}
