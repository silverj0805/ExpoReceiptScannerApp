/**
 * @gorhom/bottom-sheet가 공식으로 제공하는 목(패키지 루트의 mock.js)을 그대로 쓰면
 * `import BottomSheet from '@gorhom/bottom-sheet'`(default import)가 깨진다 — mock.js가
 * `__esModule` 플래그 없는 순수 CommonJS라, Babel의 interop이 전체 exports 객체를 감싸버려서
 * `BottomSheet`가 클래스가 아니라 `{ default, BottomSheetView, ... }` 객체 자체가 되기 때문
 * (실측 확인: 실제 패키지의 컴파일된 index.js는 `__esModule: true`를 갖고 있어 이 문제가 없음).
 *
 * `import * as`(네임스페이스 import)로 우회를 시도했지만, Babel의 `_interopRequireWildcard`도
 * 원본 CJS exports 객체 전체를 `.default`에 다시 덮어씌워서 똑같이 깨진다(실측 확인).
 * 그래서 여기서는 아예 인터롭을 안 타는 `require()`로 원본을 그대로 가져온 뒤, 이 파일 자체를
 * 진짜 ES 모듈로 다시 내보낸다(이 파일은 우리 코드라 빌드 시 __esModule이 정상적으로 붙음).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bottomSheetMock = require('@gorhom/bottom-sheet/mock');

export const BottomSheetView = bottomSheetMock.BottomSheetView;
export const BottomSheetModal = bottomSheetMock.BottomSheetModal;
export const BottomSheetModalProvider =
  bottomSheetMock.BottomSheetModalProvider;
export const BottomSheetBackdrop = bottomSheetMock.BottomSheetBackdrop;
export const BottomSheetTextInput = bottomSheetMock.BottomSheetTextInput;
export const BottomSheetScrollView = bottomSheetMock.BottomSheetScrollView;
export const BottomSheetFlatList = bottomSheetMock.BottomSheetFlatList;
export const useBottomSheet = bottomSheetMock.useBottomSheet;
export const useBottomSheetModal = bottomSheetMock.useBottomSheetModal;

export default bottomSheetMock.default;
