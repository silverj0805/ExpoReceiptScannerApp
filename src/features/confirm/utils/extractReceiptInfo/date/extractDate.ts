import { looseLabel, ocrLabelVariants } from '../ocrLabel';

/**
 * 날짜.
 * "결제일시"가 "주문일시"보다 OCR로 덜 깨지는 경향을 실제로 확인해서 먼저 시도한다.
 * "주문일시"는 앞의 "주"가 OCR로 통째로 누락되는 경우가 있어 optional로 둠.
 * 숫자 구분자(2026-09-01)와 한글 년월일(2026년09월01일)을 같은 라벨에 대해 모두 시도한다.
 * 결제일시→결제월시처럼 실측 혼동 글자도 ocrLabelVariants로 포함한다.
 * 라벨 매칭이 전부 실패하면 DATE_VALUE_PATTERNS_UNLABELED로 본문을 한 번 더 본다.
 * 연도가 2~3자리로 깨져도 월·일이 유효하면 복원한다(normalizeYear).
 */
const DATE_LABELS = [
  ...ocrLabelVariants('결제일시').map(looseLabel),
  ...ocrLabelVariants('주문일시').map(looseLabel),
  ...ocrLabelVariants('승인일시').map(looseLabel),
  ...ocrLabelVariants('문일시').map(
    variant => `${looseLabel('주')}?${looseLabel(variant)}`,
  ),
  ...ocrLabelVariants('거래일시').map(looseLabel),
];
const DATE_VALUE_NUMERIC = '(\\d{2,4})[-./](\\d{1,2})[-./](\\d{1,2})';
const DATE_VALUE_NUMERIC_4 = '(\\d{4})[-./](\\d{1,2})[-./](\\d{1,2})';
const DATE_VALUE_KOREAN =
  '(\\d{4})\\s*년\\s*(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일';
/** 라벨이 있을 때는 연도 2~3자리(206-08-31)도 허용한다. */
const DATE_VALUE_PATTERNS_LABELED = [DATE_VALUE_NUMERIC, DATE_VALUE_KOREAN];
/**
 * 라벨 없는 본문에서는 4자리 연도만 기본으로 본다.
 * 2~3자리는 전화번호(4333-08-08)와 겹치므로, 뒤에 HH:mm:ss가 있을 때만 허용한다.
 */
const DATE_VALUE_PATTERNS_UNLABELED = [
  DATE_VALUE_NUMERIC_4,
  DATE_VALUE_KOREAN,
  `${DATE_VALUE_NUMERIC}\\s+\\d{1,2}[:：]\\d{2}[:：]\\d{2}`,
];
const DATE_PATTERNS = DATE_LABELS.flatMap(label =>
  DATE_VALUE_PATTERNS_LABELED.map(
    value => new RegExp(`${label}\\s*[:：]?\\s*${value}`),
  ),
);

/**
 * 월·일은 1~12 / 1~31만 받는다. 연도 복원은 normalizeYear에 맡긴다.
 */
function isPlausibleMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/**
 * OCR이 연도 앞자리를 빠뜨린 경우(2026 → 206, 26)를 복원한다.
 * 월·일이 말이 되고 거래일시 라벨이나 HH:mm:ss가 있으면 연도는 보조 정보로 본다.
 * 3자리는 한 자리를 끼워 2000~2099 후보를 만들고, 오늘 연도에 가장 가까운 값을 고른다.
 */
function normalizeYear(
  raw: string,
  nowYear = new Date().getFullYear(),
): number | null {
  if (raw.length === 4) {
    const year = Number(raw);
    return year >= 2000 && year <= 2099 ? year : null;
  }
  if (raw.length === 2) {
    return 2000 + Number(raw);
  }
  if (raw.length !== 3) {
    return null;
  }

  const candidates: number[] = [];
  for (let pos = 0; pos <= raw.length; pos++) {
    for (let digit = 0; digit <= 9; digit++) {
      const year = Number(`${raw.slice(0, pos)}${digit}${raw.slice(pos)}`);
      if (year >= 2000 && year <= 2099) {
        candidates.push(year);
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((best, year) =>
    Math.abs(year - nowYear) < Math.abs(best - nowYear) ? year : best,
  );
}

function formatParsedDate(year: string, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
}

function resolveParsedDate(
  yearRaw: string,
  monthRaw: string,
  dayRaw: string,
): string | null {
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!isPlausibleMonthDay(month, day)) {
    return null;
  }
  const year = normalizeYear(yearRaw);
  if (year == null) {
    return null;
  }
  return formatParsedDate(String(year), month, day);
}

function matchPlausibleDateValue(
  valuePattern: string,
  rawText: string,
): string | null {
  for (const match of rawText.matchAll(new RegExp(valuePattern, 'g'))) {
    const resolved = resolveParsedDate(match[1], match[2], match[3]);
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

/**
 * 라벨이 붙은 패턴을 먼저 시도한다. 결제일시가 주문일시보다 앞선 우선순위를 유지하기 위함이다.
 * 라벨이 없거나 붙은 값이 전부 달력 범위 밖이면 DATE_VALUE_PATTERNS_UNLABELED로 본문을 한 번 더 본다.
 */
export function extractDate(rawText: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = rawText.match(pattern);
    if (!match) {
      continue;
    }
    const resolved = resolveParsedDate(match[1], match[2], match[3]);
    if (resolved) {
      return resolved;
    }
  }

  for (const valuePattern of DATE_VALUE_PATTERNS_UNLABELED) {
    const unlabeled = matchPlausibleDateValue(valuePattern, rawText);
    if (unlabeled) {
      return unlabeled;
    }
  }
  return null;
}
