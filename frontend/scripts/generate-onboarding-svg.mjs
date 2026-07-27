// 화면 배경/배너 SVG(.svg)를 SvgXml에서 쓸 수 있는 문자열 모듈(.ts)로 변환한다.
// react-native-svg의 SvgXml은 XML 문자열을 받는데, 기본 Metro는 .svg를
// 문자열로 import 하지 못하므로(별도 transformer 미사용) 여기서 미리 .ts로 굽는다.
//
// 사용법: node scripts/generate-onboarding-svg.mjs
// 디자이너가 새 배경을 전달하면 해당 assets/의 .svg를 교체하고 이 스크립트를 다시 실행한다.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src', 'screens');

// SVG 문자열 모듈을 굽는 화면별 assets 폴더 목록.
const assetDirs = [
  join(srcDir, 'OnboardingScreen', 'assets'),
  join(srcDir, 'SignupScreen', 'assets'),
];

for (const assetsDir of assetDirs) {
  const svgFiles = readdirSync(assetsDir).filter(name => name.endsWith('.svg'));

  for (const svgFile of svgFiles) {
    const base = svgFile.replace(/\.svg$/, '');
    const xml = readFileSync(join(assetsDir, svgFile), 'utf8');
    const module = `// GENERATED from ${svgFile} — do not edit by hand.\n// Regenerate with: node scripts/generate-onboarding-svg.mjs\nconst xml = ${JSON.stringify(
      xml,
    )};\nexport default xml;\n`;
    writeFileSync(join(assetsDir, `${base}.ts`), module);
    console.log(`generated ${base}.ts`);
  }
}
