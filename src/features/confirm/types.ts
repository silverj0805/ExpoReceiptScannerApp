import type { CategoryId } from '@/features/receipt/api/types/category';

export interface ConfirmFormValues {
  merchant: string;
  itemName: string;
  amount: string;
  date: string;
  category: CategoryId | '';
}

export const CATEGORY_IDS: CategoryId[] = [
  'food',
  'transit',
  'shop',
  'culture',
  'health',
  'etc',
];

export const DEFAULT_VALUES: ConfirmFormValues = {
  merchant: '',
  itemName: '',
  amount: '',
  date: '',
  category: '',
};
