/**
 * 1. 라벨 표기가 포스기/카드사마다 다르다 ("총액"뿐 아니라 "합계", "결제금액", "승인금액" 등)
 *    라벨 하나만 보면 못 잡는 영수증이 많음.
 * 2. OCR이 한글 단어 "중간"에 임의로 공백을 끼워넣는다(예: "사업지 번호", "대 표지 명")
 *    라벨 글자 사이마다 \s*를 넣어야 이런 케이스를 잡는다.
 */
export function looseLabel(label: string): string {
  return label.split('').join('\\s*');
}

/**
 * OCR이 라벨 글자 자체를 비슷한 한글로 바꾸는 실측 혼동 쌍.
 * looseLabel은 글자 사이 공백만 허용하므로, 글자가 바뀐 경우는 여기서 1글자만 치환한 변형을 만든다.
 * 임의 1글자 편집거리는 다른 라벨과 섞일 수 있어 쓰지 않는다.
 */
const OCR_CONFUSABLES: [string, string][] = [
  ['일', '월'],
  ['금', '급'],
  ['액', '맥'],
];

export function ocrLabelVariants(label: string): string[] {
  const variants = new Set([label]);
  for (const [a, b] of OCR_CONFUSABLES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      let start = 0;
      while (true) {
        const index = label.indexOf(from, start);
        if (index === -1) {
          break;
        }
        variants.add(
          `${label.slice(0, index)}${to}${label.slice(index + from.length)}`,
        );
        start = index + from.length;
      }
    }
  }
  return [...variants];
}

export function matchFirst(
  patterns: RegExp[],
  text: string,
): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}
