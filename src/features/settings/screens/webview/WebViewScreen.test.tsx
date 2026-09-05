import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import WebViewScreen from './WebViewScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
const mockedRouter = router as unknown as { back: jest.Mock };
const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('헤더에 title 파라미터를 보여준다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({
    url: 'https://example.com/privacy',
    title: '개인정보처리방침',
  });

  await render(<WebViewScreen />);

  expect(screen.getByText('개인정보처리방침')).toBeTruthy();
});

test('url이 아직 없으면 준비 중 안내를 보여주고 WebView는 렌더링하지 않는다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({ url: '', title: '이용약관' });

  await render(<WebViewScreen />);

  expect(screen.getByTestId('webview-not-ready')).toBeTruthy();
  expect(screen.queryByTestId('webview')).toBeNull();
});

test('url이 있으면 처음엔 로딩 인디케이터를 보여주다가, 로드가 끝나면 사라진다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({
    url: 'https://example.com/terms',
    title: '이용약관',
  });

  await render(<WebViewScreen />);

  expect(screen.getByTestId('webview')).toBeTruthy();
  expect(screen.getByTestId('webview-loading')).toBeTruthy();

  fireEvent(screen.getByTestId('webview'), 'loadEnd');

  await waitFor(() => {
    expect(screen.queryByTestId('webview-loading')).toBeNull();
  });
});

test('로드에 실패하면 에러 안내를 보여준다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({
    url: 'https://example.com/terms',
    title: '이용약관',
  });

  await render(<WebViewScreen />);

  fireEvent(screen.getByTestId('webview'), 'error');

  await waitFor(() => {
    expect(screen.getByTestId('webview-error')).toBeTruthy();
  });
  expect(screen.queryByTestId('webview')).toBeNull();
});

test('뒤로가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({
    url: 'https://example.com/terms',
    title: '이용약관',
  });

  await render(<WebViewScreen />);

  await fireEvent.press(screen.getByTestId('webview-back-button'));

  expect(mockedRouter.back).toHaveBeenCalled();
});
