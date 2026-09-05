import { parseReceiptText } from './parseReceiptText';

test('점포명/총 액/주문일시 라벨 기준으로 가맹점/금액/날짜를 추출한다', () => {
  const rawText = [
    '점포명 : 스타벅스 강남점',
    '서울 강남구 테헤란로 123',
    '주문일시 : 2026-08-20 14:32:00',
    '아메리카노 Tall   4,500',
    '카페라떼 Grande   5,900',
    '─────────────',
    '총 액          12,400',
  ].join('\n');

  expect(parseReceiptText(rawText)).toEqual({
    merchant: '스타벅스 강남점',
    itemName: null,
    amount: 12400,
    date: '2026-08-20',
  });
});

test('라벨과 값 사이에 콜론/공백이 없어도 추출한다', () => {
  const rawText = ['점포명GS25 역삼점', '주문일시2026-08-19', '총액6,800'].join(
    '\n',
  );

  expect(parseReceiptText(rawText)).toEqual({
    merchant: 'GS25 역삼점',
    itemName: null,
    amount: 6800,
    date: '2026-08-19',
  });
});

test('해당 라벨이 없으면 그 필드만 null이다', () => {
  expect(parseReceiptText('아무 의미 없는 텍스트')).toEqual({
    merchant: null,
    itemName: null,
    amount: null,
    date: null,
  });
});

test('실기기 실제 OCR 원문(카드전표, 라벨이 뒤섞이고 공백이 임의로 끼어든 경우)에서도 결제 정보를 추출한다', () => {
  const rawText = [
    '대기번호 167',
    '주',
    '1층',
    '사업지 번호',
    '품명',
    '대 표지 명 흉은주',
    '며 다밤 감남을지논현점',
    '과세 물품금액',
    '전화번호 070-4333-0808',
    '아메리카노 (iCF0)',
    'L긔얼음',
    '면세 물포가액',
    '부가',
    '존',
    '마인',
    '세맥',
    '서물 강남구 도산대로34길 15',
    '25)-76-00478',
    '1신용카드 승인1',
    '수주',
    '카드종류: 토스뱀크',
    '영수증',
    '액',
    '카드번호. 53275075시*^X^*k*',
    '승인번호 052032 10',
    '승인금액 2.000원',
    '적립 스탬프',
    '한부기간월시물',
    '보유 스 탬',
    '결제일시 2026-08-25 12 3: 01',
    '사용 가하(보유) 쿠폰',
    '주문 번호',
    '수량',
    '1',
    '1',
    '문일시 2026-0O6-25 1236 51',
    '가격',
    '2608251236101040',
    '2.000',
    '0원',
    '1.8199',
    '0원',
    '181원',
    '2.000',
    '0원',
    '2.000',
  ].join('\n');

  const parsed = parseReceiptText(rawText);
  expect(parsed.amount).toBe(2000);
  expect(parsed.date).toBe('2026-08-25');
  expect(parsed.merchant).toBeNull();
  expect(parsed.itemName).toBeNull();
});
