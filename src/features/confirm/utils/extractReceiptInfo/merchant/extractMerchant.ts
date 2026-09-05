import { looseLabel, matchFirst } from '../ocrLabel';

/**
 * 가맹점명.
 * "상호(명)"이 정석 라벨이지만 카드전표 양식에 따라 "점포명"/"가맹점명"/"업체명"도 쓰인다.
 * 라벨이 아예 없는 영수증(예: 라벨 없이 지점명만 찍히는 경우)은 아직 못 잡는다 — 다음 개선 과제
 */
const MERCHANT_LABELS = [
  '상호명',
  '상호',
  '가맹점명',
  '점포명',
  '점포',
  '포명',
  '업체명',
  '기기명',
];
const MERCHANT_PATTERNS = MERCHANT_LABELS.map(
  label => new RegExp(`${looseLabel(label)}\\s*[:：]?\\s*(.+)`),
);

export function extractMerchant(rawText: string): string | null {
  const merchantMatch = matchFirst(MERCHANT_PATTERNS, rawText);
  return merchantMatch ? merchantMatch[1].trim() : null;
}
