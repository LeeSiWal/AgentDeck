# Week 1: Rule Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 15 프로젝트 초기화 + manseryeok 연동 + Rule Engine 핵심 모듈 3개(constants, five-elements, ten-gods) 구현 + 본인 사주 교차 검증

**Architecture:** manseryeok-js가 사주 기둥(문자열)을 산출하면, constants.ts의 매핑 테이블로 천간/지지 인덱스를 추출하고, five-elements.ts와 ten-gods.ts가 이를 분석한다. 모든 계산은 순수 함수로 구현하며, LLM은 이 단계에서 사용하지 않는다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, TailwindCSS v4, @fullstackfamily/manseryeok, Vitest

---

## File Structure

```
cheongilab/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (최소)
│   │   └── page.tsx                # 임시 테스트 페이지
│   ├── lib/
│   │   └── saju/
│   │       └── engine/
│   │           ├── types.ts        # 전체 타입 정의
│   │           ├── constants.ts    # 천간/지지/오행 매핑 + 합충 테이블
│   │           ├── pillar.ts       # manseryeok 래퍼: 문자열→구조체 변환
│   │           ├── five-elements.ts # 오행 개수 + 강약 판단
│   │           └── ten-gods.ts     # 일간 기준 십성 배치
│   └── tests/
│       └── engine/
│           ├── constants.test.ts
│           ├── pillar.test.ts
│           ├── five-elements.test.ts
│           ├── ten-gods.test.ts
│           └── golden-cases.test.ts  # 교차 검증
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

### Task 1: 프로젝트 초기화

**Files:**
- Create: `cheongilab/` (Next.js scaffold)
- Create: `vitest.config.ts`
- Modify: `package.json` (add deps)
- Modify: `tsconfig.json` (path aliases)

- [ ] **Step 1: Next.js 15 프로젝트 생성**

```bash
cd /Users/siwal/code/agentdeck-go/~/code/saju
npx create-next-app@latest cheongilab --typescript --tailwind --app --src-dir --use-npm
```

- [ ] **Step 2: 핵심 의존성 설치**

```bash
cd cheongilab
npm install @fullstackfamily/manseryeok
npm install -D vitest @vitest/ui
```

- [ ] **Step 3: vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: package.json에 test 스크립트 추가**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: tsconfig.json에 path alias 확인**

`@/*` → `./src/*` alias가 create-next-app에서 이미 설정되어 있는지 확인. 없으면 추가.

- [ ] **Step 6: 디렉토리 구조 생성**

```bash
mkdir -p src/lib/saju/engine
mkdir -p src/tests/engine
```

- [ ] **Step 7: git init + 첫 커밋**

```bash
git init
git add -A
git commit -m "chore: init Next.js 15 project with vitest"
```

---

### Task 2: types.ts — 핵심 타입 정의

**Files:**
- Create: `src/lib/saju/engine/types.ts`
- Test: 컴파일 타입 체크로 검증

- [ ] **Step 1: 타입 파일 작성**

```typescript
// src/lib/saju/engine/types.ts

/** 천간 (天干, Heavenly Stems) */
export type CheonganKey = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';

/** 지지 (地支, Earthly Branches) */
export type JijiKey = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';

/** 오행 (五行, Five Elements) */
export type OhaengKey = '목' | '화' | '토' | '금' | '수';

/** 음양 (陰陽) */
export type EumYang = '양' | '음';

/** 십성 (十星, Ten Gods) */
export type SipseongKey =
  | '비견' | '겁재'
  | '식신' | '상관'
  | '편재' | '정재'
  | '편관' | '정관'
  | '편인' | '정인';

/** 성별 */
export type Gender = 'male' | 'female';

/** 천간 정보 */
export interface Cheongan {
  name: CheonganKey;
  hanja: string;
  index: number;         // 0~9
  ohaeng: OhaengKey;
  eumyang: EumYang;
}

/** 지지 정보 */
export interface Jiji {
  name: JijiKey;
  hanja: string;
  index: number;         // 0~11
  ohaeng: OhaengKey;
  eumyang: EumYang;
}

/** 사주 기둥 하나 */
export interface Pillar {
  stem: Cheongan;        // 천간
  branch: Jiji;          // 지지
  label: string;         // 예: "갑자", "을축"
}

/** 사주팔자 네 기둥 */
export interface FourPillars {
  year: Pillar;          // 년주
  month: Pillar;         // 월주
  day: Pillar;           // 일주
  hour: Pillar;          // 시주
}

/** 오행 분석 결과 */
export interface FiveElementAnalysis {
  counts: Record<OhaengKey, number>;          // 오행별 천간+지지 개수
  stemCounts: Record<OhaengKey, number>;      // 천간만
  branchCounts: Record<OhaengKey, number>;    // 지지만
  dominant: OhaengKey;                        // 가장 많은 오행
  missing: OhaengKey[];                       // 없는 오행
  dayMasterElement: OhaengKey;                // 일간 오행
  dayMasterStrength: 'strong' | 'weak' | 'neutral'; // 일간 강약 (간이 판단)
}

/** 십성 분석 결과 */
export interface TenGodAnalysis {
  /** 각 기둥의 천간 십성 (일간 기준) */
  stems: {
    year: SipseongKey;
    month: SipseongKey;
    day: '일간';           // 일간 자체는 기준이므로 '일간'
    hour: SipseongKey;
  };
  /** 각 기둥의 지지 십성 (지지의 본기 기준) */
  branches: {
    year: SipseongKey;
    month: SipseongKey;
    day: SipseongKey;
    hour: SipseongKey;
  };
  /** 십성 개수 집계 */
  counts: Record<SipseongKey, number>;
}

/** 사주 입력 */
export interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  gender: Gender;
}
```

- [ ] **Step 2: 컴파일 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/saju/engine/types.ts
git commit -m "feat: add core saju type definitions"
```

---

### Task 3: constants.ts — 천간/지지/오행 매핑 테이블

**Files:**
- Create: `src/lib/saju/engine/constants.ts`
- Create: `src/tests/engine/constants.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/tests/engine/constants.test.ts
import { describe, expect, test } from 'vitest';
import {
  CHEONGAN,
  JIJI,
  getCheonganByName,
  getJijiByName,
  parsePillarString,
} from '@/lib/saju/engine/constants';

describe('CHEONGAN 천간 테이블', () => {
  test('10개의 천간이 존재한다', () => {
    expect(CHEONGAN).toHaveLength(10);
  });

  test('갑은 목 양이다', () => {
    const gap = getCheonganByName('갑');
    expect(gap.ohaeng).toBe('목');
    expect(gap.eumyang).toBe('양');
    expect(gap.hanja).toBe('甲');
    expect(gap.index).toBe(0);
  });

  test('계는 수 음이다', () => {
    const gye = getCheonganByName('계');
    expect(gye.ohaeng).toBe('수');
    expect(gye.eumyang).toBe('음');
    expect(gye.index).toBe(9);
  });

  test('오행 매핑: 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수', () => {
    const pairs: [string, string][] = [
      ['갑', '목'], ['을', '목'],
      ['병', '화'], ['정', '화'],
      ['무', '토'], ['기', '토'],
      ['경', '금'], ['신', '금'],
      ['임', '수'], ['계', '수'],
    ];
    pairs.forEach(([name, element]) => {
      expect(getCheonganByName(name as any).ohaeng).toBe(element);
    });
  });
});

describe('JIJI 지지 테이블', () => {
  test('12개의 지지가 존재한다', () => {
    expect(JIJI).toHaveLength(12);
  });

  test('자는 수 양이다', () => {
    const ja = getJijiByName('자');
    expect(ja.ohaeng).toBe('수');
    expect(ja.eumyang).toBe('양');
    expect(ja.hanja).toBe('子');
  });

  test('오행 매핑: 인묘=목, 사오=화, 신유=금, 해자=수, 진술축미=토', () => {
    const mapping: [string, string][] = [
      ['인', '목'], ['묘', '목'],
      ['사', '화'], ['오', '화'],
      ['신', '금'], ['유', '금'],
      ['해', '수'], ['자', '수'],
      ['진', '토'], ['술', '토'], ['축', '토'], ['미', '토'],
    ];
    mapping.forEach(([name, element]) => {
      expect(getJijiByName(name as any).ohaeng).toBe(element);
    });
  });
});

describe('parsePillarString 기둥 문자열 파싱', () => {
  test('"갑자"를 파싱하면 stem=갑, branch=자', () => {
    const result = parsePillarString('갑자');
    expect(result.stem.name).toBe('갑');
    expect(result.branch.name).toBe('자');
  });

  test('"을축"을 파싱하면 stem=을, branch=축', () => {
    const result = parsePillarString('을축');
    expect(result.stem.name).toBe('을');
    expect(result.branch.name).toBe('축');
  });

  test('잘못된 문자열은 에러를 던진다', () => {
    expect(() => parsePillarString('가나')).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/tests/engine/constants.test.ts
```
Expected: FAIL — 모듈이 없음

- [ ] **Step 3: constants.ts 구현**

```typescript
// src/lib/saju/engine/constants.ts
import type { Cheongan, CheonganKey, Jiji, JijiKey, OhaengKey, EumYang, Pillar } from './types';

// ─── 천간 (天干) ────────────────────────────────────────────

export const CHEONGAN: readonly Cheongan[] = [
  { name: '갑', hanja: '甲', index: 0, ohaeng: '목', eumyang: '양' },
  { name: '을', hanja: '乙', index: 1, ohaeng: '목', eumyang: '음' },
  { name: '병', hanja: '丙', index: 2, ohaeng: '화', eumyang: '양' },
  { name: '정', hanja: '丁', index: 3, ohaeng: '화', eumyang: '음' },
  { name: '무', hanja: '戊', index: 4, ohaeng: '토', eumyang: '양' },
  { name: '기', hanja: '己', index: 5, ohaeng: '토', eumyang: '음' },
  { name: '경', hanja: '庚', index: 6, ohaeng: '금', eumyang: '양' },
  { name: '신', hanja: '辛', index: 7, ohaeng: '금', eumyang: '음' },
  { name: '임', hanja: '壬', index: 8, ohaeng: '수', eumyang: '양' },
  { name: '계', hanja: '癸', index: 9, ohaeng: '수', eumyang: '음' },
] as const;

// ─── 지지 (地支) ────────────────────────────────────────────

export const JIJI: readonly Jiji[] = [
  { name: '자', hanja: '子', index: 0,  ohaeng: '수', eumyang: '양' },
  { name: '축', hanja: '丑', index: 1,  ohaeng: '토', eumyang: '음' },
  { name: '인', hanja: '寅', index: 2,  ohaeng: '목', eumyang: '양' },
  { name: '묘', hanja: '卯', index: 3,  ohaeng: '목', eumyang: '음' },
  { name: '진', hanja: '辰', index: 4,  ohaeng: '토', eumyang: '양' },
  { name: '사', hanja: '巳', index: 5,  ohaeng: '화', eumyang: '음' },
  { name: '오', hanja: '午', index: 6,  ohaeng: '화', eumyang: '양' },
  { name: '미', hanja: '未', index: 7,  ohaeng: '토', eumyang: '음' },
  { name: '신', hanja: '申', index: 8,  ohaeng: '금', eumyang: '양' },
  { name: '유', hanja: '酉', index: 9,  ohaeng: '금', eumyang: '음' },
  { name: '술', hanja: '戌', index: 10, ohaeng: '토', eumyang: '양' },
  { name: '해', hanja: '亥', index: 11, ohaeng: '수', eumyang: '음' },
] as const;

// ─── 오행 상생/상극 ──────────────────────────────────────────

/** 상생: key가 생하는 대상 (목→화→토→금→수→목) */
export const SANGSAENG: Record<OhaengKey, OhaengKey> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};

/** 상극: key가 극하는 대상 (목→토→수→화→금→목) */
export const SANGGEUK: Record<OhaengKey, OhaengKey> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

// ─── 지장간 (地藏干) — 지지 속 숨은 천간 ──────────────────────
// [여기, 중기, 정기] 순서

export const JIJANGGAN: Record<JijiKey, CheonganKey[]> = {
  자: ['임', '계'],                  // 子: 壬(여기), 癸(정기)
  축: ['계', '신', '기'],            // 丑: 癸, 辛, 己
  인: ['무', '병', '갑'],            // 寅: 戊, 丙, 甲
  묘: ['갑', '을'],                  // 卯: 甲, 乙
  진: ['을', '계', '무'],            // 辰: 乙, 癸, 戊
  사: ['무', '경', '병'],            // 巳: 戊, 庚, 丙
  오: ['병', '기', '정'],            // 午: 丙, 己, 丁
  미: ['정', '을', '기'],            // 未: 丁, 乙, 己
  신: ['무', '임', '경'],            // 申: 戊, 壬, 庚
  유: ['경', '신'],                  // 酉: 庚, 辛
  술: ['신', '정', '무'],            // 戌: 辛, 丁, 戊
  해: ['무', '갑', '임'],            // 亥: 戊, 甲, 壬
};

// ─── 조회 헬퍼 ──────────────────────────────────────────────

const cheonganMap = new Map<string, Cheongan>(CHEONGAN.map(c => [c.name, c]));
const jijiMap = new Map<string, Jiji>(JIJI.map(j => [j.name, j]));

export function getCheonganByName(name: CheonganKey): Cheongan {
  const result = cheonganMap.get(name);
  if (!result) throw new Error(`Unknown cheongan: ${name}`);
  return result;
}

export function getCheonganByIndex(index: number): Cheongan {
  const result = CHEONGAN[index];
  if (!result) throw new Error(`Invalid cheongan index: ${index}`);
  return result;
}

export function getJijiByName(name: JijiKey): Jiji {
  const result = jijiMap.get(name);
  if (!result) throw new Error(`Unknown jiji: ${name}`);
  return result;
}

export function getJijiByIndex(index: number): Jiji {
  const result = JIJI[index];
  if (!result) throw new Error(`Invalid jiji index: ${index}`);
  return result;
}

/** "갑자" 같은 2글자 기둥 문자열을 Pillar로 변환 */
export function parsePillarString(str: string): Pillar {
  if (str.length !== 2) throw new Error(`Invalid pillar string: ${str}`);
  const stemChar = str[0] as CheonganKey;
  const branchChar = str[1] as JijiKey;
  const stem = cheonganMap.get(stemChar);
  const branch = jijiMap.get(branchChar);
  if (!stem) throw new Error(`Invalid stem in pillar: ${stemChar}`);
  if (!branch) throw new Error(`Invalid branch in pillar: ${branchChar}`);
  return { stem, branch, label: str };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/tests/engine/constants.test.ts
```
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/saju/engine/constants.ts src/lib/saju/engine/types.ts src/tests/engine/constants.test.ts
git commit -m "feat: add constants table (cheongan, jiji, ohaeng, jijanggan)"
```

---

### Task 4: pillar.ts — manseryeok 래퍼

**Files:**
- Create: `src/lib/saju/engine/pillar.ts`
- Create: `src/tests/engine/pillar.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/tests/engine/pillar.test.ts
import { describe, expect, test } from 'vitest';
import { calculatePillars } from '@/lib/saju/engine/pillar';
import type { SajuInput } from '@/lib/saju/engine/types';

describe('calculatePillars manseryeok 래퍼', () => {
  test('1992.10.05 15:35 양력 남성의 사주 계산', () => {
    const input: SajuInput = {
      year: 1992, month: 10, day: 5,
      hour: 15, minute: 35,
      isLunar: false, gender: 'male',
    };
    const pillars = calculatePillars(input);

    // 네 기둥 모두 존재
    expect(pillars.year).toBeDefined();
    expect(pillars.month).toBeDefined();
    expect(pillars.day).toBeDefined();
    expect(pillars.hour).toBeDefined();

    // 각 기둥의 stem/branch가 유효한 천간/지지
    expect(pillars.year.stem.index).toBeGreaterThanOrEqual(0);
    expect(pillars.year.branch.index).toBeGreaterThanOrEqual(0);

    // 년주 임신(壬申) 확인 — 1992년은 임신년
    expect(pillars.year.stem.name).toBe('임');
    expect(pillars.year.branch.name).toBe('신');
  });

  test('음력 입력도 처리한다', () => {
    const input: SajuInput = {
      year: 1992, month: 9, day: 10,
      hour: 15, minute: 35,
      isLunar: true, gender: 'male',
    };
    const pillars = calculatePillars(input);
    expect(pillars.year).toBeDefined();
    expect(pillars.day).toBeDefined();
  });

  test('FourPillars의 label이 2글자 한글이다', () => {
    const input: SajuInput = {
      year: 1990, month: 1, day: 15,
      hour: 12, minute: 0,
      isLunar: false, gender: 'female',
    };
    const pillars = calculatePillars(input);
    const keys = ['year', 'month', 'day', 'hour'] as const;
    keys.forEach(k => {
      expect(pillars[k].label).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/tests/engine/pillar.test.ts
```

- [ ] **Step 3: pillar.ts 구현**

```typescript
// src/lib/saju/engine/pillar.ts
import {
  calculateSaju,
  lunarToSolar,
} from '@fullstackfamily/manseryeok';
import { parsePillarString } from './constants';
import type { FourPillars, SajuInput } from './types';

/**
 * manseryeok-js를 사용하여 사주팔자 네 기둥을 계산한다.
 * 문자열 결과를 파싱하여 구조화된 FourPillars로 변환.
 */
export function calculatePillars(input: SajuInput): FourPillars {
  let { year, month, day, hour, minute, isLunar } = input;

  // 음력이면 양력으로 변환
  if (isLunar) {
    const solar = lunarToSolar(year, month, day);
    year = solar.year;
    month = solar.month;
    day = solar.day;
  }

  // manseryeok 사주 계산 (진태양시 보정 포함)
  const saju = calculateSaju(year, month, day, hour, minute, {
    applyTimeCorrection: true,
    longitude: 127, // 서울 기준
  });

  return {
    year: parsePillarString(saju.yearPillar),
    month: parsePillarString(saju.monthPillar),
    day: parsePillarString(saju.dayPillar),
    hour: parsePillarString(saju.hourPillar!),
  };
}
```

**참고:** manseryeok의 실제 API가 위와 다를 수 있음. 설치 후 `import`문과 함수 시그니처를 확인하고 조정 필요. `lunarToSolar` 반환 타입도 확인할 것.

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/tests/engine/pillar.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/saju/engine/pillar.ts src/tests/engine/pillar.test.ts
git commit -m "feat: add manseryeok wrapper for four pillars calculation"
```

---

### Task 5: five-elements.ts — 오행 분석

**Files:**
- Create: `src/lib/saju/engine/five-elements.ts`
- Create: `src/tests/engine/five-elements.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/tests/engine/five-elements.test.ts
import { describe, expect, test } from 'vitest';
import { analyzeFiveElements } from '@/lib/saju/engine/five-elements';
import { parsePillarString } from '@/lib/saju/engine/constants';
import type { FourPillars } from '@/lib/saju/engine/types';

function makePillars(y: string, m: string, d: string, h: string): FourPillars {
  return {
    year: parsePillarString(y),
    month: parsePillarString(m),
    day: parsePillarString(d),
    hour: parsePillarString(h),
  };
}

describe('analyzeFiveElements 오행 분석', () => {
  test('갑자/을축/병인/정묘 — 천간 오행 카운트', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);

    // 천간: 갑(목) 을(목) 병(화) 정(화) → 목2 화2
    expect(result.stemCounts.목).toBe(2);
    expect(result.stemCounts.화).toBe(2);
    expect(result.stemCounts.토).toBe(0);
    expect(result.stemCounts.금).toBe(0);
    expect(result.stemCounts.수).toBe(0);
  });

  test('갑자/을축/병인/정묘 — 지지 오행 카운트', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);

    // 지지: 자(수) 축(토) 인(목) 묘(목) → 목2 토1 수1
    expect(result.branchCounts.목).toBe(2);
    expect(result.branchCounts.토).toBe(1);
    expect(result.branchCounts.수).toBe(1);
    expect(result.branchCounts.화).toBe(0);
    expect(result.branchCounts.금).toBe(0);
  });

  test('전체 카운트는 천간+지지 합산', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);

    expect(result.counts.목).toBe(4); // 갑+을+인+묘
    expect(result.counts.화).toBe(2); // 병+정
    expect(result.counts.토).toBe(1); // 축
    expect(result.counts.금).toBe(0);
    expect(result.counts.수).toBe(1); // 자
  });

  test('dominant는 가장 많은 오행', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);
    expect(result.dominant).toBe('목');
  });

  test('missing은 0개인 오행 목록', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);
    expect(result.missing).toContain('금');
    expect(result.missing).not.toContain('목');
  });

  test('dayMasterElement는 일간의 오행', () => {
    // 일간 병(화)
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);
    expect(result.dayMasterElement).toBe('화');
  });

  test('일간 강약 판단 — 같은 오행+생해주는 오행 vs 극/설기', () => {
    // 갑자/을축/병인/정묘 → 일간 병(화)
    // 화를 돕는: 목(생) + 화(비견) = 4+2 = 6
    // 화를 약하게: 토(설기) + 금(재성) + 수(관성) = 1+0+1 = 2
    // → strong
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeFiveElements(pillars);
    expect(result.dayMasterStrength).toBe('strong');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/tests/engine/five-elements.test.ts
```

- [ ] **Step 3: five-elements.ts 구현**

```typescript
// src/lib/saju/engine/five-elements.ts
import type { FourPillars, FiveElementAnalysis, OhaengKey } from './types';
import { SANGSAENG } from './constants';

const OHAENG_KEYS: OhaengKey[] = ['목', '화', '토', '금', '수'];

function zeroCounts(): Record<OhaengKey, number> {
  return { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
}

/**
 * 사주 네 기둥의 오행 분포를 분석한다.
 * 천간/지지의 본기(本氣) 오행만 카운트한다 (지장간은 별도 분석).
 */
export function analyzeFiveElements(pillars: FourPillars): FiveElementAnalysis {
  const stemCounts = zeroCounts();
  const branchCounts = zeroCounts();

  const pillarKeys = ['year', 'month', 'day', 'hour'] as const;

  for (const key of pillarKeys) {
    stemCounts[pillars[key].stem.ohaeng]++;
    branchCounts[pillars[key].branch.ohaeng]++;
  }

  const counts = zeroCounts();
  for (const oh of OHAENG_KEYS) {
    counts[oh] = stemCounts[oh] + branchCounts[oh];
  }

  const dominant = OHAENG_KEYS.reduce((a, b) => (counts[a] >= counts[b] ? a : b));
  const missing = OHAENG_KEYS.filter(oh => counts[oh] === 0);

  const dayMasterElement = pillars.day.stem.ohaeng;
  const dayMasterStrength = judgeDayMasterStrength(dayMasterElement, counts);

  return {
    counts,
    stemCounts,
    branchCounts,
    dominant,
    missing,
    dayMasterElement,
    dayMasterStrength,
  };
}

/**
 * 일간 강약 간이 판단.
 * - 같은 오행(비겁) + 생해주는 오행(인성) 세력 vs 나머지 세력
 * - 비겁+인성이 더 크면 strong, 작으면 weak, 비슷하면 neutral
 *
 * 본격적인 판단은 격국/용신 모듈에서 지장간+월령 등을 고려해야 한다.
 * 이 함수는 1차 간이 판단용.
 */
function judgeDayMasterStrength(
  dayElement: OhaengKey,
  counts: Record<OhaengKey, number>,
): 'strong' | 'weak' | 'neutral' {
  // 나를 생하는 오행 (인성) 찾기: X가 생하면 SANGSAENG[X] === dayElement
  const parentElement = OHAENG_KEYS.find(oh => SANGSAENG[oh] === dayElement)!;

  const supporting = counts[dayElement] + counts[parentElement]; // 비겁 + 인성
  const total = OHAENG_KEYS.reduce((sum, oh) => sum + counts[oh], 0);
  const opposing = total - supporting;

  if (supporting > opposing + 1) return 'strong';
  if (opposing > supporting + 1) return 'weak';
  return 'neutral';
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/tests/engine/five-elements.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/saju/engine/five-elements.ts src/tests/engine/five-elements.test.ts
git commit -m "feat: add five elements analysis with day master strength"
```

---

### Task 6: ten-gods.ts — 십성 배치

**Files:**
- Create: `src/lib/saju/engine/ten-gods.ts`
- Create: `src/tests/engine/ten-gods.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/tests/engine/ten-gods.test.ts
import { describe, expect, test } from 'vitest';
import { analyzeTenGods, getTenGodRelation } from '@/lib/saju/engine/ten-gods';
import { parsePillarString, JIJANGGAN, getCheonganByName } from '@/lib/saju/engine/constants';
import type { FourPillars, SipseongKey } from '@/lib/saju/engine/types';

function makePillars(y: string, m: string, d: string, h: string): FourPillars {
  return {
    year: parsePillarString(y),
    month: parsePillarString(m),
    day: parsePillarString(d),
    hour: parsePillarString(h),
  };
}

describe('getTenGodRelation 십성 관계', () => {
  // 일간 갑(甲, 목 양) 기준
  test('갑 vs 갑 = 비견 (같은 오행, 같은 음양)', () => {
    expect(getTenGodRelation('갑', '갑')).toBe('비견');
  });

  test('갑 vs 을 = 겁재 (같은 오행, 다른 음양)', () => {
    expect(getTenGodRelation('갑', '을')).toBe('겁재');
  });

  test('갑 vs 병 = 식신 (내가 생하는, 같은 음양)', () => {
    expect(getTenGodRelation('갑', '병')).toBe('식신');
  });

  test('갑 vs 정 = 상관 (내가 생하는, 다른 음양)', () => {
    expect(getTenGodRelation('갑', '정')).toBe('상관');
  });

  test('갑 vs 무 = 편재 (내가 극하는, 같은 음양)', () => {
    expect(getTenGodRelation('갑', '무')).toBe('편재');
  });

  test('갑 vs 기 = 정재 (내가 극하는, 다른 음양)', () => {
    expect(getTenGodRelation('갑', '기')).toBe('정재');
  });

  test('갑 vs 경 = 편관 (나를 극하는, 같은 음양)', () => {
    expect(getTenGodRelation('갑', '경')).toBe('편관');
  });

  test('갑 vs 신 = 정관 (나를 극하는, 다른 음양)', () => {
    expect(getTenGodRelation('갑', '신')).toBe('정관');
  });

  test('갑 vs 임 = 편인 (나를 생하는, 같은 음양)', () => {
    expect(getTenGodRelation('갑', '임')).toBe('편인');
  });

  test('갑 vs 계 = 정인 (나를 생하는, 다른 음양)', () => {
    expect(getTenGodRelation('갑', '계')).toBe('정인');
  });

  // 일간 정(丁, 화 음) 기준 — 다른 일간으로 교차 검증
  test('정 vs 갑 = 정인 (나를 생하는 목, 다른 음양)', () => {
    expect(getTenGodRelation('정', '갑')).toBe('정인');
  });

  test('정 vs 경 = 정재 (내가 극하는 금, 다른 음양)', () => {
    expect(getTenGodRelation('정', '경')).toBe('정재');
  });
});

describe('analyzeTenGods 십성 분석', () => {
  test('갑자/을축/병인/정묘 — 일간 병 기준 천간 십성', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeTenGods(pillars);

    // 일간 = 병(화 양)
    // 갑(목 양) → 편인
    expect(result.stems.year).toBe('편인');
    // 을(목 음) → 정인
    expect(result.stems.month).toBe('정인');
    // 병 = 일간 자체
    expect(result.stems.day).toBe('일간');
    // 정(화 음) → 겁재
    expect(result.stems.hour).toBe('겁재');
  });

  test('갑자/을축/병인/정묘 — 지지 십성 (지지 본기 기준)', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeTenGods(pillars);

    // 일간 = 병(화 양)
    // 자(수 양) → 편관 (수 극 화, 같은 음양)
    // 축 정기 기(토 음) → 상관 (화 생 토, 다른 음양)
    // 인 정기 갑(목 양) → 편인
    // 묘 정기 을(목 음) → 정인
  });

  test('십성 카운트가 정확하다', () => {
    const pillars = makePillars('갑자', '을축', '병인', '정묘');
    const result = analyzeTenGods(pillars);

    // 전체 카운트 합산 = 7 (천간 3 + 지지 4, 일간 제외)
    const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(7);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/tests/engine/ten-gods.test.ts
```

- [ ] **Step 3: ten-gods.ts 구현**

```typescript
// src/lib/saju/engine/ten-gods.ts
import type {
  CheonganKey,
  FourPillars,
  OhaengKey,
  SipseongKey,
  TenGodAnalysis,
} from './types';
import {
  getCheonganByName,
  JIJANGGAN,
  SANGSAENG,
  SANGGEUK,
} from './constants';

/**
 * 두 천간 사이의 십성 관계를 반환한다.
 * @param dayMaster 일간 (기준)
 * @param target 비교 대상 천간
 */
export function getTenGodRelation(
  dayMaster: CheonganKey,
  target: CheonganKey,
): SipseongKey {
  const dm = getCheonganByName(dayMaster);
  const tg = getCheonganByName(target);

  const sameYinYang = dm.eumyang === tg.eumyang;

  // 같은 오행 → 비견/겁재
  if (dm.ohaeng === tg.ohaeng) {
    return sameYinYang ? '비견' : '겁재';
  }

  // 내가 생하는 오행 → 식신/상관
  if (SANGSAENG[dm.ohaeng] === tg.ohaeng) {
    return sameYinYang ? '식신' : '상관';
  }

  // 내가 극하는 오행 → 편재/정재
  if (SANGGEUK[dm.ohaeng] === tg.ohaeng) {
    return sameYinYang ? '편재' : '정재';
  }

  // 나를 극하는 오행 → 편관/정관
  if (SANGGEUK[tg.ohaeng] === dm.ohaeng) {
    return sameYinYang ? '편관' : '정관';
  }

  // 나를 생하는 오행 → 편인/정인
  if (SANGSAENG[tg.ohaeng] === dm.ohaeng) {
    return sameYinYang ? '편인' : '정인';
  }

  throw new Error(`Cannot determine ten god relation: ${dayMaster} vs ${target}`);
}

/**
 * 사주 네 기둥의 십성을 분석한다.
 * - 천간: 각 기둥의 천간을 일간과 비교
 * - 지지: 지장간의 정기(마지막 원소)를 일간과 비교
 */
export function analyzeTenGods(pillars: FourPillars): TenGodAnalysis {
  const dayMasterName = pillars.day.stem.name;

  // 천간 십성
  const stems = {
    year: getTenGodRelation(dayMasterName, pillars.year.stem.name),
    month: getTenGodRelation(dayMasterName, pillars.month.stem.name),
    day: '일간' as const,
    hour: getTenGodRelation(dayMasterName, pillars.hour.stem.name),
  };

  // 지지 십성: 지장간 정기(배열 마지막) 기준
  const branches = {
    year: getJijiTenGod(dayMasterName, pillars.year.branch.name),
    month: getJijiTenGod(dayMasterName, pillars.month.branch.name),
    day: getJijiTenGod(dayMasterName, pillars.day.branch.name),
    hour: getJijiTenGod(dayMasterName, pillars.hour.branch.name),
  };

  // 십성 카운트 집계
  const counts: Record<SipseongKey, number> = {
    비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
    정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
  };

  // 천간 (일간 제외)
  for (const key of ['year', 'month', 'hour'] as const) {
    counts[stems[key]]++;
  }
  // 지지
  for (const key of ['year', 'month', 'day', 'hour'] as const) {
    counts[branches[key]]++;
  }

  return { stems, branches, counts };
}

/** 지지의 정기(지장간 마지막 원소)로 십성을 구한다 */
function getJijiTenGod(
  dayMaster: CheonganKey,
  branchName: string,
): SipseongKey {
  const hidden = JIJANGGAN[branchName as keyof typeof JIJANGGAN];
  const junggi = hidden[hidden.length - 1]; // 정기 = 마지막
  return getTenGodRelation(dayMaster, junggi);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/tests/engine/ten-gods.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/saju/engine/ten-gods.ts src/tests/engine/ten-gods.test.ts
git commit -m "feat: add ten gods analysis (sipseong)"
```

---

### Task 7: golden-cases.test.ts — 본인 사주 교차 검증

**Files:**
- Create: `src/tests/engine/golden-cases.test.ts`

- [ ] **Step 1: 골든 케이스 테스트 작성**

본인 사주(1992.10.05 15:35)를 만세력닷컴에서 조회한 결과와 교차 검증.
실제 구현 시 만세력닷컴 결과를 확인한 뒤 expected 값을 채워야 함.

```typescript
// src/tests/engine/golden-cases.test.ts
import { describe, expect, test } from 'vitest';
import { calculatePillars } from '@/lib/saju/engine/pillar';
import { analyzeFiveElements } from '@/lib/saju/engine/five-elements';
import { analyzeTenGods } from '@/lib/saju/engine/ten-gods';
import type { SajuInput } from '@/lib/saju/engine/types';

interface GoldenCase {
  name: string;
  input: SajuInput;
  expected: {
    yearPillar: string;    // 예: "임신"
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    dayMasterElement: string;
  };
}

// NOTE: expected 값은 만세력닷컴/포스텔러에서 실제 조회하여 채울 것
const GOLDEN_CASES: GoldenCase[] = [
  {
    name: '이시월 본인 (1992.10.05 15:35 양력 남성)',
    input: {
      year: 1992, month: 10, day: 5,
      hour: 15, minute: 35,
      isLunar: false, gender: 'male',
    },
    expected: {
      yearPillar: '임신',     // 壬申 (1992년)
      monthPillar: '기유',    // 己酉 (음력 9월, 절기 기준)
      dayPillar: '',          // manseryeok 출력 후 확인하여 채움
      hourPillar: '',         // manseryeok 출력 후 확인하여 채움
      dayMasterElement: '',   // 일간 확인 후 채움
    },
  },
];

describe('골든 케이스 교차 검증', () => {
  GOLDEN_CASES.forEach(({ name, input, expected }) => {
    test(name, () => {
      const pillars = calculatePillars(input);

      // 년주 검증
      if (expected.yearPillar) {
        expect(pillars.year.label).toBe(expected.yearPillar);
      }

      // 월주 검증
      if (expected.monthPillar) {
        expect(pillars.month.label).toBe(expected.monthPillar);
      }

      // 일주 검증
      if (expected.dayPillar) {
        expect(pillars.day.label).toBe(expected.dayPillar);
      }

      // 시주 검증
      if (expected.hourPillar) {
        expect(pillars.hour.label).toBe(expected.hourPillar);
      }

      // 오행 분석
      const fiveElements = analyzeFiveElements(pillars);
      if (expected.dayMasterElement) {
        expect(fiveElements.dayMasterElement).toBe(expected.dayMasterElement);
      }

      // 십성 분석 (크래시 안 나는지 확인)
      const tenGods = analyzeTenGods(pillars);
      expect(tenGods.stems.day).toBe('일간');

      // 디버그 출력 — 만세력닷컴과 비교용
      console.log(`\n=== ${name} ===`);
      console.log(`년주: ${pillars.year.label} (${pillars.year.stem.hanja}${pillars.year.branch.hanja})`);
      console.log(`월주: ${pillars.month.label} (${pillars.month.stem.hanja}${pillars.month.branch.hanja})`);
      console.log(`일주: ${pillars.day.label} (${pillars.day.stem.hanja}${pillars.day.branch.hanja})`);
      console.log(`시주: ${pillars.hour.label} (${pillars.hour.stem.hanja}${pillars.hour.branch.hanja})`);
      console.log(`일간 오행: ${fiveElements.dayMasterElement}`);
      console.log(`오행 분포:`, fiveElements.counts);
      console.log(`일간 강약: ${fiveElements.dayMasterStrength}`);
      console.log(`십성 천간:`, tenGods.stems);
      console.log(`십성 지지:`, tenGods.branches);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 + 결과 확인**

```bash
npx vitest run src/tests/engine/golden-cases.test.ts
```

디버그 출력을 만세력닷컴 결과와 비교하여 expected 값을 채운다.

- [ ] **Step 3: expected 값 업데이트 + 재실행**

만세력닷컴 조회 결과로 빈 문자열을 채우고 다시 실행하여 전수 통과 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/tests/engine/golden-cases.test.ts
git commit -m "test: add golden case for cross-validation with manseryeok.com"
```

---

## Execution Order Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | 프로젝트 초기화 | — |
| 2 | types.ts 타입 정의 | Task 1 |
| 3 | constants.ts 매핑 테이블 | Task 2 |
| 4 | pillar.ts manseryeok 래퍼 | Task 3 |
| 5 | five-elements.ts 오행 분석 | Task 3 |
| 6 | ten-gods.ts 십성 배치 | Task 3 |
| 7 | golden-cases.test.ts 교차 검증 | Task 4, 5, 6 |

Task 5와 6은 독립적이므로 병렬 실행 가능.
