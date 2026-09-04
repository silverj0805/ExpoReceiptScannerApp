import axios from 'axios';
import { getUniqueId } from 'react-native-device-info';

import { recordApiError } from '@/shared/firebase/crashlyticsRecorder';

const REQUEST_TIMEOUT_MS = 10_000;

// eslint-disable-next-line import/no-named-as-default-member -- axios 공식 사용법 그대로(default import 후 axios.create 호출)
const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: REQUEST_TIMEOUT_MS,
});

/**
 * 기기별 고유 ID(react-native-device-info의 getUniqueId)를 매 요청에 X-Device-Id 헤더로 실어 보냄
 * receiptsRouter의 미들웨어가 이 헤더 없으면 400을 줌
 * 참고) 진짜 인증은 아니어서 헤더 조작 가능 위험 있음
 */
client.interceptors.request.use(async config => {
  const deviceId = await getUniqueId();
  config.headers['X-Device-Id'] = deviceId;
  return config;
});

// API 에러는 화면/엔드포인트/상태코드/응답 본문 컨텍스트와 함께 Crashlytics에 기록.
client.interceptors.response.use(
  response => response,
  error => {
    recordApiError(error, error?.config, error?.response);
    return Promise.reject(error);
  },
);

export default client;
