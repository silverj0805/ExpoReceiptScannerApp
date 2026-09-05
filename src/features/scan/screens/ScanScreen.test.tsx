import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import ScanScreen from './ScanScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
const mockedRouter = router as unknown as { push: jest.Mock; back: jest.Mock };

// Camera는 네이티브 프리뷰 뷰라서 Jest에서 그릴 수 없어 View로 대체.
// 목에서는 받은 props를 그대로 View에 넘겨서 onPreviewStarted/onError를
// fireEvent(getByTestId('camera'), ...)로 트리거할 수 있게 한다.
jest.mock('react-native-vision-camera', () => {
  // jest.mock 팩토리는 호이스팅돼서 밖의(모듈 최상단) import를 참조할 수 없어
  // 인라인 require가 불가피함 — @react-native/eslint-config를 쓰는 CLI 쪽에는 없던
  // eslint-config-expo의 @typescript-eslint/no-require-imports 규칙이라 여기서만 걸림.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Camera: (props: Record<string, unknown>) => (
      <View testID="camera" {...props} />
    ),
    CommonResolutions: { UHD_4_3: { width: 3024, height: 4032 } },
    useCameraDevice: jest.fn(),
    useCameraPermission: jest.fn(),
    usePhotoOutput: jest.fn(),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

const mockedUseCameraPermission = useCameraPermission as jest.Mock;
const mockedUseCameraDevice = useCameraDevice as jest.Mock;
const mockedUsePhotoOutput = usePhotoOutput as jest.Mock;
const mockedLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.Mock;

const mockRequestPermission = jest.fn();
const mockCapturePhoto = jest.fn();
const mockSaveToTemporaryFileAsync = jest.fn();
const mockDispose = jest.fn();

function setPermission(state: {
  hasPermission: boolean;
  canRequestPermission: boolean;
}) {
  mockedUseCameraPermission.mockReturnValue({
    ...state,
    requestPermission: mockRequestPermission,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseCameraDevice.mockReturnValue({ id: 'back-camera' });
  mockedUsePhotoOutput.mockReturnValue({ capturePhoto: mockCapturePhoto });
  mockCapturePhoto.mockResolvedValue({
    saveToTemporaryFileAsync: mockSaveToTemporaryFileAsync,
    dispose: mockDispose,
  });
  mockSaveToTemporaryFileAsync.mockResolvedValue('file:///tmp/photo.jpg');
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  // 실제 vision-camera의 requestPermission()은 Promise<boolean>을 반환한다
  // (usePermission 훅이 .catch()로 rejection을 처리하므로 기본값이 필요).
  mockRequestPermission.mockResolvedValue(true);
});

test('카메라 권한이 아직 결정되지 않았으면 마운트 시 권한을 요청한다', async () => {
  setPermission({ hasPermission: false, canRequestPermission: true });

  await render(<ScanScreen />);

  await waitFor(() => {
    expect(mockRequestPermission).toHaveBeenCalled();
  });
  expect(screen.queryByText('카메라 접근 권한이 필요해요')).toBeNull();
  expect(screen.queryByTestId('camera-preview')).toBeNull();
});

test('권한 요청이 "No Activity!" 같은 일시적 네이티브 에러로 실패해도 크래시 없이 넘어가고, 잠시 후 재시도한다', async () => {
  jest.useFakeTimers();
  setPermission({ hasPermission: false, canRequestPermission: true });
  mockRequestPermission.mockRejectedValueOnce(new Error('No Activity!'));
  mockRequestPermission.mockResolvedValueOnce(true);

  await render(<ScanScreen />);

  await waitFor(() => {
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  // 재시도 지연(500ms) 전에는 아직 다시 호출되지 않는다.
  expect(mockRequestPermission).toHaveBeenCalledTimes(1);

  await act(async () => {
    jest.advanceTimersByTime(500);
  });

  await waitFor(() => {
    expect(mockRequestPermission).toHaveBeenCalledTimes(2);
  });

  jest.useRealTimers();
});

test('카메라 권한이 거부됐으면 설정으로 이동 안내를 보여준다', async () => {
  setPermission({ hasPermission: false, canRequestPermission: false });

  await render(<ScanScreen />);

  expect(screen.getByText('카메라 접근 권한이 필요해요')).toBeTruthy();
  expect(
    screen.getByText('영수증을 스캔하려면\n카메라 권한을 허용해주세요'),
  ).toBeTruthy();
  expect(screen.getByText('설정으로 이동')).toBeTruthy();
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

test('설정으로 이동 버튼을 누르면 시스템 설정 앱을 연다', async () => {
  setPermission({ hasPermission: false, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByText('설정으로 이동'));

  expect(Linking.openSettings).toHaveBeenCalled();
});

test('권한 거부 화면에서 나중에 하기를 누르면 이전 화면으로 돌아간다', async () => {
  setPermission({ hasPermission: false, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByText('나중에 하기'));

  expect(mockedRouter.back).toHaveBeenCalled();
});

test('카메라 권한이 있으면 카메라 프리뷰와 스캔 헤더를 보여준다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  expect(screen.getByTestId('camera-preview')).toBeTruthy();
  expect(screen.getByText('영수증 스캔')).toBeTruthy();
});

test('카메라 디바이스가 아직 없으면 프리뷰 없이 로딩 스피너만 보여준다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });
  mockedUseCameraDevice.mockReturnValue(null);

  await render(<ScanScreen />);

  expect(screen.queryByTestId('camera-preview')).toBeNull();
  expect(screen.getByTestId('camera-loading')).toBeTruthy();
});

test('카메라 프리뷰가 첫 프레임을 그리기 전까지는 로딩 스피너를 보여준다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  expect(screen.getByTestId('camera-loading')).toBeTruthy();
});

test('카메라 프리뷰가 시작되면 로딩 스피너가 사라진다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);
  await fireEvent(screen.getByTestId('camera'), 'previewStarted');

  await waitFor(() => {
    expect(screen.queryByTestId('camera-loading')).toBeNull();
  });
});

test('카메라 초기화에 실패해도 로딩 스피너가 계속 뜨지 않는다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);
  await fireEvent(screen.getByTestId('camera'), 'error');

  await waitFor(() => {
    expect(screen.queryByTestId('camera-loading')).toBeNull();
  });
});

test('헤더 아래에 인식률을 높이는 촬영 팁 안내 문구를 보여준다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  expect(
    screen.getByText(
      '인식률을 높이기 위해 선명한 화질로 필요한 정보만 가까이서 찍어주세요',
    ),
  ).toBeTruthy();
});

test('닫기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-close-button'));

  expect(mockedRouter.back).toHaveBeenCalled();
});

test('촬영 버튼을 누르면 사진을 찍어서 확인 화면으로 이동한다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-capture-button'));

  await waitFor(() => {
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: { imageUri: 'file:///tmp/photo.jpg' },
    });
  });
  expect(mockCapturePhoto).toHaveBeenCalledWith({ flashMode: 'off' }, {});
  expect(mockSaveToTemporaryFileAsync).toHaveBeenCalled();
  expect(mockDispose).toHaveBeenCalled();
});

test('촬영 중에는 버튼이 비활성화돼서 연속 촬영을 막는다', async () => {
  mockCapturePhoto.mockReturnValue(new Promise(() => {}));
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  fireEvent.press(screen.getByTestId('scan-capture-button'));

  await waitFor(() => {
    expect(
      screen.getByTestId('scan-capture-button').props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  fireEvent.press(screen.getByTestId('scan-capture-button'));
  expect(mockCapturePhoto).toHaveBeenCalledTimes(1);
});

test('촬영이 실패하면 다시 촬영할 수 있게 버튼이 풀린다', async () => {
  mockCapturePhoto.mockRejectedValue(new Error('CAPTURE_ERROR'));
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-capture-button'));

  await waitFor(() => {
    expect(
      screen.getByTestId('scan-capture-button').props.accessibilityState
        .disabled,
    ).toBe(false);
  });
  expect(mockedRouter.push).not.toHaveBeenCalled();
});

test('촬영 결과 경로에 스킴이 없으면 file:// 스킴을 붙여서 넘긴다', async () => {
  mockSaveToTemporaryFileAsync.mockResolvedValue(
    '/data/user/0/com.silverj0805.exporeceiptscannerapp/cache/VisionCamera_1.jpg',
  );
  setPermission({ hasPermission: true, canRequestPermission: false });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-capture-button'));

  await waitFor(() => {
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: {
        imageUri:
          'file:///data/user/0/com.silverj0805.exporeceiptscannerapp/cache/VisionCamera_1.jpg',
      },
    });
  });
});

test('갤러리에서 사진을 선택하면 확인 화면으로 이동한다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });
  mockedLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/gallery.jpg' }],
  });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-gallery-button'));

  await waitFor(() => {
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: { imageUri: 'file:///tmp/gallery.jpg' },
    });
  });
});

test('갤러리 선택을 취소하면 화면 이동이 일어나지 않는다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });
  mockedLaunchImageLibraryAsync.mockResolvedValue({
    canceled: true,
    assets: null,
  });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-gallery-button'));

  await waitFor(() => {
    expect(mockedLaunchImageLibraryAsync).toHaveBeenCalled();
  });
  expect(mockedRouter.push).not.toHaveBeenCalled();
});

test('갤러리 결과에 uri가 없으면 화면 이동이 일어나지 않는다', async () => {
  setPermission({ hasPermission: true, canRequestPermission: false });
  mockedLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{}],
  });

  await render(<ScanScreen />);

  await fireEvent.press(screen.getByTestId('scan-gallery-button'));

  await waitFor(() => {
    expect(mockedLaunchImageLibraryAsync).toHaveBeenCalled();
  });
  expect(mockedRouter.push).not.toHaveBeenCalled();
});
