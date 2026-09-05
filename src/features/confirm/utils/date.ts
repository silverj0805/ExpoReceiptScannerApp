import dayjs from 'dayjs';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toPickerDate = (value: string, today: Date) =>
  DATE_PATTERN.test(value) ? dayjs(value).toDate() : today;

export const formatPickerDate = (date: Date) => dayjs(date).format('YYYY-MM-DD');
