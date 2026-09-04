import type { ColorValue } from 'react-native';
import { useCSSVariable } from 'uniwind';

/**
 * uniwind의 useCSSVariable은 CSS 변수가(스페이싱처럼) 숫자일 수도 있어서
 * `string | number | undefined`로 넓게 타입돼 있다. 여기서는 항상 `--color-*` 변수만
 * 조회하므로(네이티브에서 색상 변수는 항상 문자열) style의 backgroundColor/color 같은
 * ColorValue 자리에 바로 못 쓰는 타입 불일치만 좁혀서 없애준다.
 */
export function useCSSColorVariable(name: string): ColorValue | undefined {
  return useCSSVariable(name) as ColorValue | undefined;
}
