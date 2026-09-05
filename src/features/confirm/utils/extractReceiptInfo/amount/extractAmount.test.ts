import { extractAmount } from './extractAmount';

test('총액 라벨 기준으로 금액을 추출한다', () => {
  expect(extractAmount('총 액          12,400')).toBe(12400);
});

test('라벨과 값 사이에 콜론/공백이 없어도 추출한다', () => {
  expect(extractAmount('총액6,800')).toBe(6800);
});

test('해당 라벨이 없고 금액 포맷도 없으면 null이다', () => {
  expect(extractAmount('아무 의미 없는 텍스트')).toBeNull();
});

test('금액 라벨이 "합계"여도 추출한다', () => {
  expect(extractAmount('합계 8,000')).toBe(8000);
});

test('금액 자릿수 구분자가 쉼표 대신 마침표로 오인식돼도 추출한다', () => {
  expect(extractAmount('승인금액 2.000원')).toBe(2000);
});

test('OCR이 승인금액의 액을 맥으로 바꿔도 금액을 추출한다', () => {
  expect(extractAmount('승인금맥 2.000원')).toBe(2000);
});

test('OCR이 결제금액의 금을 급으로 바꿔도 금액을 추출한다', () => {
  expect(extractAmount('결제급액 3,000')).toBe(3000);
});

test('합계 바로 위 줄의 금액을 추출한다', () => {
  const rawText = ['17,900', '합계', '베이컨(돼지고기'].join('\n');

  expect(extractAmount(rawText)).toBe(17900);
});

test('합계 위 두 번째 줄의 단가는 집지 않는다', () => {
  const rawText = ['6,200', '17,900', '합계'].join('\n');

  expect(extractAmount(rawText)).toBe(17900);
});

test('합계 라벨이 없으면 금액 포맷 중 최댓값을 합계로 본다', () => {
  const rawText = ['6,200', '6, 100', '5,60', '17,900'].join('\n');

  expect(extractAmount(rawText)).toBe(17900);
});

test('금액 중간 공백과 원/% 오인식도 금액 포맷으로 본다', () => {
  expect(extractAmount('2,000원\n18,000%')).toBe(18000);
});
