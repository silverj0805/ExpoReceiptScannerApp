module.exports = {
  arrowParens: 'avoid',
  singleQuote: true,
  trailingComma: 'all',
  plugins: ['prettier-plugin-tailwindcss'],
  // Tailwind v4는 CSS-first 설정(tailwind.config.js 없음)이라, 테마/커스텀 유틸리티가
  // 정의된 진입점 CSS를 직접 알려줘야 className을 올바른 순서로 정렬할 수 있다.
  tailwindStylesheet: './src/global.css',
};
