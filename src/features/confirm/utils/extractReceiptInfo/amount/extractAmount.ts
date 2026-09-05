import { looseLabel, matchFirst, ocrLabelVariants } from '../ocrLabel';

/**
 * 금액.
 * "합계"/"총액" 같은 영수증 자체 라벨이 없는(카드전표만 있는) 경우를 대비해 "승인금액"도 포함.
 * 숫자의 천단위 구분 쉼표(,)를 OCR이 마침표(.)로 잘못 읽는 경우가 흔해서(예: "2.000")
 * 둘 다 허용하고, 숫자로 변환할 때 함께 제거한다.
 * 라벨은 ocrLabelVariants로 1글자 오인식(결제급액, 승인금맥 등)까지 펼친다.
 * 라벨로 못 찾으면 천단위 금액 토큰 중 최댓값을 합계로 본다(findLargestMoneyAmount).
 */
const AMOUNT_LABELS = ['합계', '총액', '결제금액', '승인금액', '받을금액'];
const AMOUNT_LABEL_VARIANTS = AMOUNT_LABELS.flatMap(ocrLabelVariants);
const AMOUNT_PATTERNS = AMOUNT_LABEL_VARIANTS.map(
  label =>
    new RegExp(`${looseLabel(label)}\\s*[:：]?\\s*[₩]?\\s*(\\d[\\d,.]*)`),
);
const AMOUNT_LABEL_LINE = new RegExp(
  AMOUNT_LABEL_VARIANTS.map(looseLabel).join('|'),
);
/** 배달앱 주문서처럼 합계 바로 위에만 있는 `17,900` 형태. 천단위 구분자가 있어야 단가/수량을 덜 집는다. */
const AMOUNT_ABOVE_LINE = /^(\d{1,3}(?:[,.]\d{3})+)$/;
/**
 * 2,000 / 18,000 / 2,000원 / 2,000% / 6, 100 처럼 천단위 구분(콤마·점)이 있는 금액.
 * 5,60처럼 콤마 뒤가 3자리가 아니면 금액으로 보지 않는다.
 */
const MONEY_TOKEN = /\d{1,3}(?:\s*[,.]\s*\d{3})+(?:\s*(?:원|%))?/g;

function toAmount(raw: string): number {
  return Number(raw.replace(/[,.]/g, ''));
}

/**
 * 라벨로 합계를 못 잡을 때(항목이 여러 줄인 배달 주문서 등) 쓰는 폴백.
 * 금액 포맷에 맞는 토큰만 모은 뒤 최댓값을 고른다. 총액이 단가보다 큰 경우가 많아서다.
 * `6, 100`처럼 자릿수 사이 공백은 지운 다음 파싱한다.
 */
function findLargestMoneyAmount(rawText: string): number | null {
  const tokens = rawText.match(new RegExp(MONEY_TOKEN, 'g'));
  if (!tokens) {
    return null;
  }

  let max: number | null = null;
  for (const token of tokens) {
    const normalized = token.replace(/\s/g, '').replace(/[원%]$/, '');
    const amount = toAmount(normalized);
    if (!Number.isFinite(amount)) {
      continue;
    }
    if (max == null || amount > max) {
      max = amount;
    }
  }
  return max;
}

/**
 * 라벨 뒤 숫자를 먼저 찾고, 없으면 라벨이 있는 줄의 바로 위 한 줄만 본다.
 * 쿠팡이츠 주문서처럼 `17,900` 다음 줄이 `합계`인 레이아웃용이다.
 * 위를 N줄 훑으면 품목 단가(6,200)를 집을 수 있어 바로 위 1줄 + 천단위 구분자 줄만 허용한다.
 * 라벨 매칭이 전부 실패하면 금액 포맷 토큰 중 최댓값을 합계로 본다.
 */
export function extractAmount(rawText: string): number | null {
  const forward = matchFirst(AMOUNT_PATTERNS, rawText);
  if (forward) {
    return toAmount(forward[1]);
  }

  const lines = rawText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 || !AMOUNT_LABEL_LINE.test(lines[i])) {
      continue;
    }
    const above = lines[i - 1].replace(/\s/g, '');
    const aboveMatch = above.match(AMOUNT_ABOVE_LINE);
    if (aboveMatch) {
      return toAmount(aboveMatch[1]);
    }
  }
  return findLargestMoneyAmount(rawText);
}
