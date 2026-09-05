import { extractDate } from './extractDate';

test('주문일시에 시:분:초가 없어도 날짜만 추출한다', () => {
  expect(extractDate('주문일시 : 2026-01-05')).toBe('2026-01-05');
});

test('날짜 구분자가 슬래시/마침표여도 하이픈으로 정규화한다', () => {
  expect(extractDate('결제일시 2026/08/25')).toBe('2026-08-25');
  expect(extractDate('결제일시 2026.08.25')).toBe('2026-08-25');
});

test('한글 년월일 표기도 하이픈 날짜로 정규화한다', () => {
  expect(extractDate('거래일시: 2026년09월01일12시37분46 초')).toBe(
    '2026-09-01',
  );
  expect(extractDate('결제일시 2026년 9월 1일')).toBe('2026-09-01');
});

test('월이 1~12 밖이면 그 매치를 버리고 날짜는 null이다', () => {
  expect(extractDate('결제일시 2026-00-26')).toBeNull();
});

test('거래일시 연도가 3자리로 깨지고 시각이 남아 있으면 월일을 살린다', () => {
  expect(extractDate('거래일시:206-08-31 10:59:41')).toBe('2026-08-31');
});

test('거래일시 연도가 2자리여도 월일을 살린다', () => {
  expect(extractDate('거래일시:26-08-31 10:59:41')).toBe('2026-08-31');
});

test('날짜 라벨이 없어도 값 패턴이면 추출한다', () => {
  expect(extractDate('2026-08-31 10:59:41')).toBe('2026-08-31');
  expect(extractDate('2026년09월01일12시37분46초')).toBe('2026-09-01');
});

test('전화번호처럼 날짜가 아닌 숫자 묶음은 집지 않는다', () => {
  expect(extractDate('070-4333-0808')).toBeNull();
});

test('OCR이 결제일시의 일을 월로 바꿔도 날짜를 추출한다', () => {
  expect(extractDate('결제월시2026-08-25 12 3101')).toBe('2026-08-25');
});

test('결제일시와 주문일시가 둘 다 있으면 결제일시를 우선한다', () => {
  const rawText = [
    '결제일시 2026-08-25 12:31:01',
    '주문일시 2026-08-25 12:36:51',
  ].join('\n');

  expect(extractDate(rawText)).toBe('2026-08-25');
});
