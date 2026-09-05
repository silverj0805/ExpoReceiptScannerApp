import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FormControl, FormField, FormTextInput } from './FormField';

test('필수 필드는 라벨 앞에 *를 붙인다', async () => {
  await render(
    <FormField label="가맹점명" required>
      <FormTextInput />
    </FormField>,
  );

  expect(screen.getByText('*가맹점명')).toBeTruthy();
});

test('선택 필드는 라벨만 보여준다', async () => {
  await render(
    <FormField label="품명">
      <FormTextInput />
    </FormField>,
  );

  expect(screen.getByText('품명')).toBeTruthy();
  expect(screen.queryByText('*품명')).toBeNull();
});

test('error가 있으면 에러 문구를 보여준다', async () => {
  await render(
    <FormField label="금액" required error="금액을 입력해주세요">
      <FormTextInput />
    </FormField>,
  );

  expect(screen.getByText('금액을 입력해주세요')).toBeTruthy();
});

test('error가 없으면 에러 문구를 그리지 않는다', async () => {
  await render(
    <FormField label="금액" required>
      <FormTextInput />
    </FormField>,
  );

  expect(screen.queryByText('금액을 입력해주세요')).toBeNull();
});

test('FormControl 안에 넣은 내용을 보여준다', async () => {
  await render(
    <FormField label="날짜" required>
      <FormControl>
        <Text>날짜를 선택해주세요</Text>
      </FormControl>
    </FormField>,
  );

  expect(screen.getByText('날짜를 선택해주세요')).toBeTruthy();
});

test('FormTextInput은 placeholder와 값을 그대로 받는다', async () => {
  await render(
    <FormField label="가맹점명" required>
      <FormTextInput
        testID="merchant-input"
        value="스타벅스 강남점"
        placeholder="가맹점명을 입력해주세요"
      />
    </FormField>,
  );

  expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  expect(screen.getByPlaceholderText('가맹점명을 입력해주세요')).toBeTruthy();
});
