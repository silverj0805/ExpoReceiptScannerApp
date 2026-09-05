import { useEffect } from 'react';
import { useCameraPermission } from 'react-native-vision-camera';

/**
 * 앱을 갓 설치하고 바로 화면에 들어오는 것처럼
 * 네이티브 Activity가 브릿지에 붙기 전에 requestPermission()이 불리면
 * vision-camera(안드로이드)가 "No Activity!" 네이티브 에러로 즉시 reject 되며 앱이 크래쉬됨
 * 이런 타이밍 문제는 보통 아주 짧은 시간 안에 풀리므로, 실패하면 잠시 후 한 번 더 시도
 */
const RETRY_DELAY_MS = 500;

const usePermission = () => {
  const { hasPermission, canRequestPermission, requestPermission } =
    useCameraPermission();

  const isPermissionPending = !hasPermission && canRequestPermission;
  const isPermissionDenied = !hasPermission && !canRequestPermission;

  useEffect(() => {
    if (!isPermissionPending) {
      return;
    }

    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const attempt = () => {
      requestPermission().catch(() => {
        if (!isCancelled) {
          retryTimer = setTimeout(attempt, RETRY_DELAY_MS);
        }
      });
    };

    attempt();

    return () => {
      isCancelled = true;
      clearTimeout(retryTimer);
    };
  }, [isPermissionPending, requestPermission]);

  return {
    isPermissionPending,
    isPermissionDenied,
  };
};

export default usePermission;
