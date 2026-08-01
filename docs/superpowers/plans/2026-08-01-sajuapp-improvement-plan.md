# Sajuapp 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재의 단일 페이지 사주 앱을 개인정보가 브라우저 밖으로 나가지 않는 장점은 유지하면서, 안전하고 검증 가능하며 모바일에서 쓰기 편한 서비스로 개선한다.

**Architecture:** React 같은 UI 프레임워크로 전면 재작성하지 않고, Vite + TypeScript 기반의 Vanilla DOM 앱으로 점진 이관한다. 계산 엔진, 해석 데이터, 화면 렌더링을 분리하고 한국천문연구원(KASI) 자료로 경계값을 검증한다. 초기 릴리스는 완전한 클라이언트 전용 정적 앱을 유지한다.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright, `@axe-core/playwright`, `astronomy-engine`, pnpm, GitHub Actions, GitHub Pages

---

## 1. 분석 범위와 결론

분석 기준 저장소: [lotussj0225/Sajuapp](https://github.com/lotussj0225/Sajuapp), `main` 브랜치의 `e709100` 커밋.

원기획 채팅 요구사항: [`docs/chat-requirements-019e5e1b.md`](../../chat-requirements-019e5e1b.md). 세션 `019e5e1b-6c05-7530-8c93-5608c6ad6f8b`의 사용자 요청을 현재 앱과 각 Task의 완료 조건에 연결했다.

현재 앱은 `index.html`, `styles.css`, `app.js`, `README.md` 네 파일로 구성된 클라이언트 전용 웹앱이다. 외부 전송이나 저장 로직이 없고 375px 모바일 화면에서도 본문 가로 넘침 없이 동작하는 점은 좋다. 반면, 계산·해석·렌더링 로직 약 22KB가 `app.js` 36줄에 압축되어 있고 자동 테스트·빌드·CI가 없어 계산 변경의 안전성을 보장하기 어렵다.

### 확인된 개선 사항

| 우선순위 | 영역 | 근거 | 영향 | 계획상 조치 |
|---|---|---|---|---|
| P0 | 입력 안전성 | `app.js:26`, `app.js:33`, `app.js:35`에서 이름을 HTML 문자열에 결합한다. `<img onerror=...>` 입력으로 코드 실행을 재현했다. | 임의 HTML/스크립트 실행 | Task 2에서 회귀 테스트 후 즉시 차단 |
| P0 | 오류 상태 | `app.js:35`의 예외 처리는 제목만 바꾸며 이전 명식·대운·해석을 남긴다. 잘못된 윤달 입력 후 재현했다. | 오류 메시지와 과거 결과가 동시에 보여 오판 가능 | Task 2에서 단일 오류 상태로 초기화 |
| P0 | 절입 정확도 | `app.js:4`, `app.js:14-15`, `app.js:27`은 절기를 매년 고정된 날짜 00:00으로 처리한다. 앱은 `2024-02-04 12:00`을 갑진년으로 계산하지만 KASI의 2024년 입춘은 2월 4일 17:27이다. | 입춘·절입 경계 출생자의 년주·월주·대운이 달라짐 | Task 4에서 시각 단위 절입 계산과 KASI 적합성 테스트 도입 |
| P1 | 야자시 정책 | `app.js:18`은 야자시 옵션을 끄면 23:30 이후 일주를 다음 날로 넘긴다. 옵션을 켰을 때와 의미가 반대로 읽힐 수 있다. | 일주 변경 및 해석 전체 변경 | Task 0에서 정책 고정, Task 4에서 23:29/23:30/00:00 테스트 |
| P1 | 대운 정확도 | `app.js:27-28`은 고정 절기일과 정수 반올림 나이를 사용하고 달력 연도를 `출생연도 + 나이`로 단순 계산한다. | 대운 시작 시점과 현재 대운 카드 오차 | Task 4에서 절입 시각과 월 단위 시작 나이 사용 |
| P1 | 해석 과장 가능성 | `app.js:17`, `app.js:19`, `app.js:23-24`는 표면 8글자와 지지 본기 하나만 세어 이를 “오행 균형”과 대표 십성으로 표시한다. 동률 처리도 입력 순서에 좌우된다. | 제한된 계산이 완전한 균형 분석처럼 보임 | Task 5에서 용어 수정, 근거·가정 표시, 동률 처리 |
| P1 | 유지보수성 | `app.js`가 36개의 긴 줄에 도메인·문구·DOM 처리를 모두 포함한다. | 변경 영향 파악과 코드 리뷰가 어려움 | Task 3에서 순수 함수 중심 TypeScript 모듈로 분리 |
| P1 | 검증 체계 | 패키지 설정, 단위 테스트, E2E, CI가 없다. | 회귀와 브라우저 차이를 배포 전에 발견하지 못함 | Task 1과 Task 7에서 테스트/CI 도입 |
| P2 | 모바일 흐름 | 375×812 실행 시 입력 패널 높이가 약 815px, 결과 시작점이 약 823px이다. 제출 후 자동 이동이 없어 결과를 다시 찾아야 한다. | 핵심 결과 도달성 저하 | Task 6에서 제출 후 결과 포커스/스크롤과 입력 요약 제공 |
| P2 | 접근성 | `index.html:177-181`은 `tablist`만 있고 각 버튼의 `role=tab`, `aria-selected`, 키보드 방향키 처리가 없다. 오류 제목도 라이브 영역이 아니다. | 키보드·스크린리더 사용성 저하 | Task 6에서 WAI-ARIA 탭 패턴과 axe 검사 적용 |
| P2 | 결과 가독성 | 모바일 결과가 약 2,420px로 길고 해석이 긴 문단 중심이다. 대운 목록은 폭 345px 안에서 1,188px 가로 스크롤을 사용한다. | 중요한 근거와 결론을 빠르게 찾기 어려움 | Task 5-6에서 요약/근거/상세의 3단 구조와 스크롤 안내 제공 |
| P3 | 운영 | 배포 워크플로, 품질 게이트, 계산 정책 문서, 변경 기록이 없다. | 배포 재현성과 신뢰성 저하 | Task 7에서 CI, Pages, 문서화 적용 |

### 확인된 장점

- [x] 이름·생년월일시를 네트워크로 전송하거나 저장하지 않는다.
- [x] 외부 런타임 의존성이 없어 현재 정적 앱의 공격 표면과 운영비가 작다.
- [x] 375px 화면에서 `body` 가로 넘침은 재현되지 않았다.
- [x] `2026-06-01` 일진은 앱과 KASI 자료가 모두 `丙午`로 일치했다.
- [x] 양력/음력, 윤달, 야자시, 십성, 대운까지 핵심 사용자 흐름이 이미 연결되어 있다.

### 원채팅 요구사항에서 반드시 보존할 기능

- [ ] 천간 4칸 + 지지 4칸에 한자를 표시하는 8칸 명식판
- [ ] 화면 오른쪽부터 년주·월주·일주·시주 순서
- [ ] 야자시 적용 선택과 적용 기준 설명
- [ ] 320px 이상 모바일 환경의 전문적인 명식 가독성
- [ ] 총운·일·관계·시기 네 가지 해석 탭
- [ ] 10년 단위 대운 8개와 현재 구간 강조
- [ ] 양력·음력·윤달 입력과 변환 결과 표시
- [ ] 일간 기준 년월일시주 십성, 육친, 사회관계, 적성 해석
- [ ] 외부 사주 API 없이 브라우저 내부 계산을 유지한다는 출처·개인정보 설명

## 2. 접근 방법 비교와 최종 선택

### 접근 A — Vanilla JavaScript 최소 패치

- 장점: 가장 빠르고 현재의 “설치 없이 실행” 특성을 그대로 유지한다.
- 단점: 타입 검증과 모듈 경계가 약하며, 36줄 압축 파일을 계속 확장하면 계산 회귀 위험이 남는다.
- 적합성: P0 보안 핫픽스에는 적합하지만 중장기 구조로는 부족하다.

### 접근 B — Vite + TypeScript 점진 이관 (권장)

- 장점: 기존 HTML/CSS 디자인을 보존하면서 계산을 순수 함수로 분리하고, Vitest/Playwright로 경계값을 고정할 수 있다. React 런타임과 컴포넌트 재작성 비용이 없다.
- 단점: 패키지 설치와 빌드 단계가 추가되며 `index.html` 직접 열기 대신 개발 서버 또는 빌드 결과를 사용해야 한다.
- 적합성: 현재 규모에서 정확도·유지보수성·복잡도의 균형이 가장 좋다.

### 접근 C — React/Next.js 전면 재작성

- 장점: 향후 계정, 결제, 서버 저장, AI 해석까지 확장할 때 생태계가 크다.
- 단점: 현재 네 파일짜리 정적 앱에는 과도하며, UI 재작성 중 계산 오류를 만들 가능성과 번들 비용이 증가한다.
- 적합성: 계정/결제/서버 기능이 실제 요구사항으로 확정되기 전에는 적용하지 않는다.

**결정:** P0 문제는 현재 구조에서 먼저 막고, 같은 릴리스 브랜치에서 접근 B로 이관한다. 접근 C는 이번 계획 범위에서 제외한다.

## 3. 변경 후 파일 구조

```text
Sajuapp/
├─ index.html                         # 접근 가능한 앱 셸과 초기/오류/결과 영역
├─ package.json                       # 개발·검증·빌드 명령
├─ pnpm-lock.yaml                     # 재현 가능한 의존성 잠금
├─ tsconfig.json                      # strict TypeScript 설정
├─ vite.config.ts                     # 정적 빌드와 GitHub Pages base 설정
├─ eslint.config.js                   # TypeScript/DOM 정적 검사
├─ playwright.config.ts               # Chromium 모바일/데스크톱 E2E
├─ src/
│  ├─ main.ts                         # 앱 초기화와 이벤트 연결만 담당
│  ├─ styles.css                      # 기존 스타일 이관 및 반응형 개선
│  ├─ app/
│  │  ├─ controller.ts                # 폼 입력 → 계산 → 화면 상태 전환
│  │  ├─ state.ts                     # idle/loading/success/error 상태 모델
│  │  └─ render.ts                    # 안전한 DOM 렌더링과 탭 동작
│  ├─ domain/
│  │  ├─ types.ts                     # BirthInput, Pillar, Chart, Daeun 등 공용 타입
│  │  ├─ constants.ts                 # 천간·지지·오행·지장간 불변 데이터
│  │  ├─ calendar/
│  │  │  ├─ lunar.ts                  # 음력→양력 변환
│  │  │  └─ solarTerms.ts             # 절입 시각 탐색과 KST 비교
│  │  ├─ saju/
│  │  │  ├─ pillars.ts                # 년·월·일·시주 계산
│  │  │  ├─ tenGods.ts                # 십성 및 지장간 관계
│  │  │  └─ daeun.ts                  # 방향, 시작 시점, 10년 주기
│  │  └─ interpretation/
│  │     ├─ facts.ts                  # 계산 사실과 가정 생성
│  │     └─ reading.ts                # 총운/일/관계/시기 문구 생성
│  └─ data/
│     └─ lunar-info.ts                # 1900-2050 내장 음력표와 출처 메모
├─ tests/
│  ├─ fixtures/kasi-calendar.ts       # KASI 출처가 기록된 기대값
│  ├─ unit/calendar.test.ts
│  ├─ unit/pillars.test.ts
│  ├─ unit/ten-gods.test.ts
│  ├─ unit/daeun.test.ts
│  └─ e2e/saju-flow.spec.ts
├─ docs/
│  ├─ calculation-policy.md           # 계산 기준과 지원/비지원 범위
│  └─ verification.md                 # KASI 대조 결과와 재검증 방법
└─ .github/workflows/
   ├─ ci.yml                          # lint/unit/e2e/build 품질 게이트
   └─ deploy-pages.yml                # main 성공 빌드의 Pages 배포
```

## 4. 단계별 실행 계획

### Task 0: 계산 정책을 코드보다 먼저 고정

**Files:**

- Create: `docs/calculation-policy.md`
- Modify: `README.md`

- [x] **Step 1: 아래 정책을 `docs/calculation-policy.md`에 명시한다**

```markdown
# 계산 정책

- 기준 시간대: Asia/Seoul(KST, UTC+09:00)
- 입력 범위: 양력/음력 1900-01-01부터 2050-12-31
- 년주 경계: 해당 연도 입춘의 정확한 KST 시각
- 월주 경계: 12개 절입(소한·입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설)의 정확한 KST 시각
- 일주 경계: 민간 날짜의 00:00
- 야자시 미적용: 23:30 이후에도 00:00 전까지 일주와 시주 천간의 날짜 기준을 바꾸지 않음
- 야자시 적용: 23:30부터 시주 천간의 날짜 기준만 다음 날로 전환하고 일주는 00:00까지 현재 날짜 유지
- 성별 미선택: 순행/역행을 임의 추정하지 않고 대운 결과를 보류
- 대운 시작: 출생시각과 순행이면 다음 절입, 역행이면 이전 절입의 차이를 `3일 = 1년`, `1일 = 4개월`로 환산
- 진태양시·출생지 경도·서머타임·학파별 용신 판단: 이번 릴리스에서 지원하지 않으며 UI에 명시
```

- [ ] **Step 2: 정책의 학파 의존 항목을 사주 전문가 1인에게 검토받는다**

검토자는 야자시 일주 경계와 대운 환산법에 대해 `승인` 또는 구체적인 수정 문구를 남긴다. 승인 전에는 Task 4를 배포하지 않는다.

현재 상태(2026-08-01): 외부 검토 대기. `docs/calculation-policy.md`의 "외부 검토 기록"에서 추적한다.

- [x] **Step 3: README의 “24절기 근사” 표현을 정책 문서 링크와 현재 한계로 교체한다**

Expected: 사용자가 앱 화면과 README에서 같은 계산 기준을 읽을 수 있다.

- [ ] **Step 4: 정책 문서 커밋**

```bash
git add docs/calculation-policy.md README.md
git commit -m "docs: define saju calculation policy"
```

### Task 1: 재현 가능한 개발 환경과 현재 동작의 특성 테스트 구축

**Files:**

- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `playwright.config.ts`
- Create: `tests/e2e/saju-flow.spec.ts`

- [ ] **Step 1: 도구를 설치하고 lockfile을 생성한다**

```bash
pnpm init
pnpm add astronomy-engine
pnpm add -D typescript vite vitest @vitest/coverage-v8 playwright @axe-core/playwright eslint @eslint/js typescript-eslint prettier
pnpm exec playwright install chromium
```

Expected: `package.json`과 `pnpm-lock.yaml`이 생성되고 설치 오류가 없다.

- [ ] **Step 2: `package.json` 스크립트를 다음 이름으로 고정한다**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "lint": "eslint . --max-warnings=0",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm format:check && pnpm test && pnpm build"
  }
}
```

- [ ] **Step 3: TypeScript를 `strict: true`, `noUncheckedIndexedAccess: true`로 설정한다**

Expected: 새 도메인 코드는 암시적 `any`와 확인되지 않은 배열 접근을 허용하지 않는다.

- [ ] **Step 4: 현재 동작을 고정하는 E2E 테스트를 먼저 작성한다**

```ts
test("valid solar input renders four pillars and eight daeun cards", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("양력 생년월일").fill("1990-01-01");
  await page.getByLabel("태어난 시간").fill("23:45");
  await page.getByLabel("성별").selectOption("male");
  await page.getByRole("button", { name: "사주 보기" }).click();
  await expect(page.locator(".pillar-title")).toHaveText(["시주", "일주", "월주", "년주"]);
  await expect(page.locator(".palja-cell strong")).toHaveCount(8);
  await expect(page.locator(".daeun-card")).toHaveCount(8);
});
```

- [ ] **Step 5: 현재 앱에서 테스트가 통과하는지 확인한다**

Run: `pnpm test:e2e`

Expected: 기본 양력 입력, 음력 입력, 탭 전환, 375px 렌더링 테스트가 PASS.

- [ ] **Step 6: 기반 환경 커밋**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts eslint.config.js playwright.config.ts tests
git commit -m "test: add baseline browser regression suite"
```

### Task 2: P0 보안·오류 상태 핫픽스

**Files:**

- Modify: `app.js:26-35`
- Modify: `index.html:22-25`
- Modify: `index.html:111-119`
- Test: `tests/e2e/saju-flow.spec.ts`

- [ ] **Step 1: XSS를 재현하는 실패 테스트를 추가한다**

```ts
test("name is rendered as text and never executes HTML", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("이름").fill('<img src=x onerror="document.body.dataset.xss=1">');
  await page.getByRole("button", { name: "사주 보기" }).click();
  await page.waitForTimeout(100);
  await expect(page.locator("body")).not.toHaveAttribute("data-xss", "1");
  await expect(page.locator("#readingText img")).toHaveCount(0);
});
```

- [ ] **Step 2: 잘못된 윤달 입력 시 과거 결과가 남는 실패 테스트를 추가한다**

```ts
test("invalid input clears every previous result", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("양력 생년월일").fill("1990-01-01");
  await page.getByLabel("태어난 시간").fill("12:00");
  await page.getByLabel("성별").selectOption("male");
  await page.getByRole("button", { name: "사주 보기" }).click();
  await expect(page.locator(".daeun-card")).toHaveCount(8);
  await page.getByLabel("달력").selectOption("lunar");
  await page.getByLabel("윤달").check();
  await expect(page.getByRole("alert")).toContainText("윤달이 없습니다");
  await expect(page.locator(".daeun-card")).toHaveCount(0);
  await expect(page.locator("#readingText")).toBeEmpty();
});
```

- [ ] **Step 3: 우선 핫픽스로 이름을 HTML 이스케이프하고 길이를 제한한다**

```js
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
const displayName = () => {
  const value = $("#name").value.trim().slice(0, 30);
  return value ? `${escapeHtml(value)}님` : "당신";
};
```

`index.html`의 이름 입력에는 `maxlength="30"`을 추가한다. Task 3 이관 후에는 이스케이프 문자열 결합 대신 `textContent`와 DOM 노드 생성만 사용한다.

- [ ] **Step 4: `renderError(message)`를 추가해 성공 상태를 완전히 지운다**

```js
function renderError(message) {
  currentChart = null;
  $("#resultKicker").textContent = "날짜 입력 확인";
  $("#resultTitle").textContent = message;
  $("#dayMasterBadge").textContent = "확인";
  $("#pillarGrid").replaceChildren();
  $("#daeunList").replaceChildren();
  $("#elementBars").replaceChildren();
  $("#readingText").replaceChildren();
}
```

`#resultTitle`을 포함하는 오류 컨테이너에는 `role="alert"`를 적용하고 성공 시 제거한다.

- [ ] **Step 5: 보안 메타 정책을 추가한다**

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'self'"
/>
```

- [ ] **Step 6: 회귀 확인**

Run: `pnpm test:e2e`

Expected: XSS와 stale-state 테스트가 PASS하고 기존 양력/음력 흐름도 PASS.

- [ ] **Step 7: 핫픽스 커밋**

```bash
git add app.js index.html tests/e2e/saju-flow.spec.ts
git commit -m "fix: secure user input and clear invalid results"
```

### Task 3: 계산과 화면 코드를 TypeScript 모듈로 분리

**Files:**

- Create: `src/main.ts`
- Create: `src/app/controller.ts`
- Create: `src/app/state.ts`
- Create: `src/app/render.ts`
- Create: `src/domain/types.ts`
- Create: `src/domain/constants.ts`
- Create: `src/domain/calendar/lunar.ts`
- Create: `src/domain/saju/pillars.ts`
- Create: `src/domain/saju/tenGods.ts`
- Create: `src/domain/saju/daeun.ts`
- Create: `src/domain/interpretation/facts.ts`
- Create: `src/domain/interpretation/reading.ts`
- Move: `styles.css` → `src/styles.css`
- Delete after parity verification: `app.js`
- Modify: `index.html:7,191`

- [ ] **Step 1: 공용 타입을 먼저 정의한다**

```ts
export type FiveElement = "목" | "화" | "토" | "금" | "수";
export type YinYang = "양" | "음";
export type Gender = "female" | "male" | null;
export type CalendarType = "solar" | "lunar";

export interface BirthInput {
  name: string;
  calendarType: CalendarType;
  date: string;
  time: string;
  isLeapMonth: boolean;
  gender: Gender;
  yajaEnabled: boolean;
  timeZone: "Asia/Seoul";
}

export interface Pillar {
  key: "year" | "month" | "day" | "hour";
  label: "년주" | "월주" | "일주" | "시주";
  index: number;
  hanja: string;
  stemIndex: number;
  branchIndex: number;
}

export interface ChartResult {
  input: BirthInput;
  solarDate: { year: number; month: number; day: number };
  pillars: readonly [Pillar, Pillar, Pillar, Pillar];
  dayMasterStemIndex: number;
  visibleElementCounts: Readonly<Record<FiveElement, number>>;
  assumptions: readonly string[];
}
```

- [ ] **Step 2: `app.js:1-5` 불변 데이터를 `constants.ts`와 `lunar-info.ts`로 이동한다**

Expected: 데이터 배열은 `as const`이고 화면 요소나 `document`에 의존하지 않는다.

- [ ] **Step 3: `app.js:7-28` 계산 함수를 DOM 없는 순수 함수로 이동한다**

Expected: `calculateChart(input: BirthInput, now: Date): ChartResult`가 같은 입력과 `now`에서 항상 같은 값을 반환한다.

- [ ] **Step 4: `app.js:29-35` 렌더링을 `render.ts`로 이동하고 사용자 데이터는 `textContent`로만 삽입한다**

금지 패턴 검사:

```bash
rg "innerHTML.*name|insertAdjacentHTML|outerHTML" src
```

Expected: 사용자 입력이 HTML 문자열에 결합되는 검색 결과가 0건.

- [ ] **Step 5: 상태를 판별 가능한 유니온으로 만든다**

```ts
export type AppState =
  | { status: "idle" }
  | { status: "success"; chart: ChartResult }
  | { status: "error"; message: string };
```

- [ ] **Step 6: `index.html` 엔트리를 교체한다**

```html
<link rel="stylesheet" href="/src/styles.css" />
<script type="module" src="/src/main.ts"></script>
```

- [ ] **Step 7: 기능 동등성 검증 후 `app.js`를 삭제한다**

Run: `pnpm check && pnpm test:e2e`

Expected: 기존 E2E가 모두 PASS하고 `app.js` 없이 앱이 실행된다.

- [ ] **Step 8: 구조 이관 커밋**

```bash
git add index.html src tests
git rm app.js styles.css
git commit -m "refactor: separate saju domain from DOM rendering"
```

### Task 4: 절입·야자시·대운 정확도 개선과 KASI 대조

**Files:**

- Create: `src/domain/calendar/solarTerms.ts`
- Create: `src/data/solar-term-overrides.ts`
- Create: `tests/fixtures/kasi-calendar.ts`
- Create: `tests/unit/calendar.test.ts`
- Create: `tests/unit/pillars.test.ts`
- Create: `tests/unit/daeun.test.ts`
- Modify: `src/domain/saju/pillars.ts`
- Modify: `src/domain/saju/daeun.ts`
- Create: `docs/verification.md`

- [ ] **Step 1: KASI 기대값에 출처 URL과 조회일을 함께 기록한다**

최소 필수 fixture:

```ts
export const KASI_CASES = {
  source: "https://astro.kasi.re.kr/kor/life/post/calendarData",
  accessedOn: "2026-08-01",
  dayPillar: [{ date: "2026-06-01", expected: "丙午" }],
  solarTerms: [
    { name: "입춘", atKst: "2024-02-04T17:27:00+09:00", longitude: 315 },
    { name: "경칩", atKst: "2025-03-05T17:07:00+09:00", longitude: 345 },
  ],
  lunar: [
    { lunar: "2025-06-01", leap: false, solar: "2025-06-25" },
    { lunar: "2025-06-01", leap: true, solar: "2025-07-25" },
  ],
} as const;
```

출처는 KASI 달력자료와 공공데이터포털 음양력 정보 API로 제한한다.

- [ ] **Step 2: 절입 시각 계산 실패 테스트를 작성한다**

`pillars.ts`는 `yearPillarAt(instantKst: string): Pillar`를 공개하며, 입력은 반드시 UTC offset을 포함한 ISO 8601 문자열이어야 한다.

```ts
it("changes the year pillar at the exact 2024 ipchun boundary", () => {
  expect(yearPillarAt("2024-02-04T17:26:59+09:00").hanja).toBe("癸卯");
  expect(yearPillarAt("2024-02-04T17:27:00+09:00").hanja).toBe("甲辰");
});
```

- [ ] **Step 3: `SearchSunLongitude(targetLon, start, limitDays)`로 12개 절입을 탐색한다**

```ts
export const SECTION_TERMS = [
  { name: "소한", longitude: 285, branchIndex: 1 },
  { name: "입춘", longitude: 315, branchIndex: 2 },
  { name: "경칩", longitude: 345, branchIndex: 3 },
  { name: "청명", longitude: 15, branchIndex: 4 },
  { name: "입하", longitude: 45, branchIndex: 5 },
  { name: "망종", longitude: 75, branchIndex: 6 },
  { name: "소서", longitude: 105, branchIndex: 7 },
  { name: "입추", longitude: 135, branchIndex: 8 },
  { name: "백로", longitude: 165, branchIndex: 9 },
  { name: "한로", longitude: 195, branchIndex: 10 },
  { name: "입동", longitude: 225, branchIndex: 11 },
  { name: "대설", longitude: 255, branchIndex: 0 },
] as const;
```

각 결과는 UTC epoch로 비교하고 표시만 `Asia/Seoul`로 변환한다. 브라우저의 로컬 시간대에 계산 결과가 달라지면 실패로 처리한다.

- [ ] **Step 4: KASI 절기 시각 적합성 게이트를 추가한다**

2024-2028년 12개 절입 총 60건에서 계산값과 KASI 차이가 2분 이내여야 한다. 한 건이라도 초과하면 배포를 중단하고, 해당 연도·절기의 KASI 시각을 `src/data/solar-term-overrides.ts`의 `solarTermOverrides`에 기록한 뒤 이유와 출처를 `docs/verification.md`에 남긴다.

- [ ] **Step 5: 일진과 음력 변환 회귀 세트를 확장한다**

검증 수량:

- 각 10년 구간의 시작·중간·끝 날짜 3건 이상
- 1900, 2000, 2050 경계
- 1900-2050의 모든 윤달에 대해 평달 1건 + 윤달 1건
- 월말 29일/30일과 유효하지 않은 날짜

Expected: 모든 fixture가 KASI 기대값과 일치한다.

- [ ] **Step 6: 야자시 정책 테스트를 작성하고 역전 동작을 수정한다**

`pillars.ts`에 아래 반환 계약을 사용한다.

```ts
export type BoundaryPolicy = "civil" | "next-day-hour-stem" | "next-civil-day";

export interface DayBoundaryResult {
  policy: BoundaryPolicy;
  dayDate: string;
  hourStemDate: string;
}

export function resolveDayBoundary(
  date: string,
  time: string,
  yajaEnabled: boolean,
): DayBoundaryResult;
```

```ts
it.each([
  ["23:29", false, "civil"],
  ["23:30", false, "civil"],
  ["23:30", true, "next-day-hour-stem"],
  ["00:00", true, "next-civil-day"],
])("applies the documented boundary at %s", (time, enabled, expectedPolicy) => {
  expect(resolveDayBoundary("1990-01-01", time, enabled).policy).toBe(expectedPolicy);
});
```

- [ ] **Step 7: 대운 시작을 정수 년이 아닌 년·개월로 계산한다**

```ts
const DAY_MS = 86_400_000;
const totalMonths = Math.round((distanceMs / DAY_MS) * 4);
const startYears = Math.floor(totalMonths / 12);
const startMonths = totalMonths % 12;
```

성별이 `null`이면 임시 순행/역행을 만들지 않고 `status: "requires-gender"`를 반환한다.

- [ ] **Step 8: 정확도 전체 검증**

Run: `pnpm test tests/unit/calendar.test.ts tests/unit/pillars.test.ts tests/unit/daeun.test.ts --coverage`

Expected: 계산 모듈 statement/branch coverage 95% 이상, 경계 fixture 100% PASS.

- [ ] **Step 9: 정확도 개선 커밋**

```bash
git add src/domain tests docs/verification.md
git commit -m "fix: calculate pillars from exact solar term boundaries"
```

### Task 5: 해석을 “계산 사실 → 해석 → 한계” 구조로 개선

**Files:**

- Modify: `src/domain/constants.ts`
- Modify: `src/domain/interpretation/facts.ts`
- Modify: `src/domain/interpretation/reading.ts`
- Create: `tests/unit/ten-gods.test.ts`
- Create: `tests/unit/reading.test.ts`
- Modify: `index.html:167-186`

- [ ] **Step 1: 10×10 천간 십성 조합을 표 기반 테스트로 고정한다**

Expected: 같은 오행/같은 음양은 비견, 같은 오행/다른 음양은 겁재이며 나머지 생극 관계 90건도 전부 기대값과 일치한다.

- [ ] **Step 2: 지지에 본기만 쓰는 사실을 숨기지 않도록 데이터 모델을 확장한다**

`constants.ts`에 각 지지의 전체 지장간 배열을 저장하되, 학파별 비율을 임의로 숫자화하지 않는다. 결과에는 `visibleStem`, `branchMainStem`, `hiddenStems`를 분리해 표시한다.

- [ ] **Step 3: 동률을 임의의 대표 십성 하나로 축약하지 않는다**

```ts
export interface RankedFact<T> {
  leaders: readonly T[];
  score: number;
  isTie: boolean;
}
```

Expected: 최고 점수가 같은 십성은 모두 `leaders`에 포함된다.

- [ ] **Step 4: UI 용어를 계산 범위에 맞게 바꾼다**

- `오행 균형` → `표면 오행 분포`
- `가장 부족한 오행` → `표면 글자에서 적게 나타난 오행`
- `당신에게 맞는 직업` → `십성 관점의 참고 적성`
- `현재 대운` → 계산 정책에 따른 `대운 구간`

- [ ] **Step 5: 결과를 세 층으로 렌더링한다**

1. 한 줄 요약
2. 계산 근거: 네 기둥, 표면 오행 수, 십성 관계, 사용한 정책
3. 상세 해석과 “참고용이며 중요한 의사결정의 단독 근거로 사용하지 않음” 안내

원채팅에서 확정된 `overall`, `career`, `love`, `timing` 네 탭을 유지한다. 각 탭은 단순 문단 수가 아니라 최소 하나의 명식 근거, 위치별 관계, 사용한 가정과 한계를 포함해야 한다. 화면에는 외부 사주 API가 아니라 브라우저 내부 규칙으로 해석을 생성한다는 출처 설명을 제공한다.

- [ ] **Step 6: 해석 안정성 테스트를 작성한다**

`reading.ts`의 반환 계약은 다음과 같다.

```ts
export interface ReadingOutput {
  sections: readonly { id: "overall" | "career" | "love" | "timing"; body: string }[];
  assumptions: readonly string[];
}

export function buildReading(chart: ChartResult, now: Date): ReadingOutput;
```

```ts
it("never emits undefined and discloses assumptions", () => {
  const now = new Date("2026-08-01T00:00:00Z");
  const chart = calculateChart({
    name: "테스트",
    calendarType: "solar",
    date: "1990-01-01",
    time: "12:00",
    isLeapMonth: false,
    gender: "male",
    yajaEnabled: true,
    timeZone: "Asia/Seoul",
  }, now);
  const reading = buildReading(chart, now);
  const body = reading.sections.map((section) => section.body).join(" ");
  expect(body).not.toContain("undefined");
  expect(reading.assumptions).toContain("진태양시 미적용");
});
```

- [ ] **Step 7: 해석 개선 커밋**

```bash
git add src/domain/interpretation src/domain/constants.ts index.html tests/unit
git commit -m "feat: make interpretation evidence and limits explicit"
```

### Task 6: 모바일 결과 도달성·접근성·가독성 개선

**Files:**

- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/app/controller.ts`
- Modify: `src/app/render.ts`
- Modify: `tests/e2e/saju-flow.spec.ts`

- [ ] **Step 1: 초기 자동 계산을 제거한다**

Expected: 첫 진입은 샘플 날짜의 결과를 만들지 않고 `idle` 안내만 보인다. 날짜 기본값을 제공하더라도 사용자가 `사주 보기`를 누르기 전에는 결과가 생성되지 않는다.

- [ ] **Step 2: 제출 성공 후 결과 제목으로 이동한다**

```ts
resultHeading.tabIndex = -1;
resultHeading.focus({ preventScroll: true });
resultHeading.scrollIntoView({ behavior: "smooth", block: "start" });
```

모바일에서는 입력 패널을 `입력 수정` 요약으로 접고, 사용자가 원할 때 다시 펼칠 수 있게 한다.

- [ ] **Step 3: WAI-ARIA 탭 패턴을 완성한다**

각 탭에 `role="tab"`, `aria-selected`, `aria-controls`, roving `tabindex`를 부여하고 ArrowLeft/ArrowRight/Home/End 키를 지원한다. 해석 영역은 `role="tabpanel"`과 `aria-labelledby`를 갖는다.

- [ ] **Step 4: 오류와 결과 갱신을 스크린리더에 알린다**

오류 영역은 `role="alert"`, 계산 완료 요약은 `aria-live="polite"`를 사용한다. 명식 8칸 전체를 한 번에 반복 낭독하지 않도록 `pillarGrid` 전체의 라이브 속성은 제거하고 짧은 요약만 알린다.

- [ ] **Step 5: 대운 가로 스크롤에 조작 단서를 추가한다**

모바일에 `이전/다음` 버튼, 현재 카드 위치 텍스트(`3 / 8`), `scroll-snap-type: x mandatory`를 적용한다. 버튼은 실제 스크롤 위치와 동기화하고 키보드로 각 카드에 도달할 수 있어야 한다.

- [ ] **Step 6: 모바일과 접근성 E2E를 추가한다**

검증 뷰포트: 320×568, 375×812, 768×1024, 1440×900.

Expected:

- 모든 뷰포트에서 `document.body.scrollWidth <= window.innerWidth`
- 제출 후 결과 제목이 포커스를 받음
- 탭 방향키 이동 PASS
- axe의 critical/serious 위반 0건
- 이름, 날짜, 시간, 성별, 달력 종류에 접근 가능한 이름 존재

- [ ] **Step 7: 모바일 Lighthouse 기준을 확인한다**

Run: `pnpm build && pnpm exec vite preview`

Target: Performance 90+, Accessibility 95+, Best Practices 95+.

- [ ] **Step 8: UX 커밋**

```bash
git add index.html src/app src/styles.css tests/e2e
git commit -m "feat: improve mobile result flow and accessibility"
```

### Task 7: CI·배포·문서·릴리스 품질 게이트 완성

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `.github/dependabot.yml`
- Modify: `vite.config.ts`
- Modify: `README.md`
- Modify: `docs/verification.md`

- [ ] **Step 1: PR과 main에서 동일한 품질 검사를 실행한다**

`ci.yml` 실행 순서:

```text
checkout → pnpm 설치 → frozen lockfile 설치 → lint → format check
→ unit coverage → Playwright Chromium → production build
```

Expected: 한 단계라도 실패하면 merge/deploy가 중단된다.

- [ ] **Step 2: GitHub Pages base 경로를 저장소명에 맞춘다**

```ts
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Sajuapp/" : "/",
});
```

- [ ] **Step 3: CI 성공 artifact만 Pages에 배포한다**

`deploy-pages.yml`은 `main` push에서 `pnpm build` 후 `dist/`만 업로드한다. 소스 브랜치에 생성물을 커밋하지 않는다.

- [ ] **Step 4: README를 운영 문서로 확장한다**

반드시 포함할 항목:

- 로컬 실행: `pnpm install`, `pnpm dev`
- 전체 검증: `pnpm check`, `pnpm test:e2e`
- 계산 기준과 KASI 대조 링크
- 개인정보가 브라우저 밖으로 전송되지 않는다는 현재 구조
- 진태양시·출생지 보정 미지원
- 참고용 서비스 안내
- 배포 URL과 마지막 검증일

- [ ] **Step 5: 의존성 자동 업데이트를 주 1회로 제한한다**

Dependabot PR은 `pnpm check`와 E2E를 모두 통과해야 병합한다.

- [ ] **Step 6: 최종 릴리스 검증**

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Expected:

- 모든 명령 exit code 0
- 계산 모듈 statement/branch coverage 95% 이상
- axe critical/serious 0건
- XSS 회귀 테스트 PASS
- KASI fixture 100% PASS
- `dist/` gzip 합계 200KB 이하 또는 초과 사유를 `docs/verification.md`에 기록

- [ ] **Step 7: 최종 커밋과 태그**

```bash
git add .github README.md docs vite.config.ts
git commit -m "ci: verify and deploy Sajuapp"
git tag -a v1.0.0 -m "Verified Sajuapp baseline"
```

## 5. 릴리스 순서와 예상 공수

| 릴리스 | 포함 Task | 예상 공수 | 배포 조건 |
|---|---|---:|---|
| 0.1 안전 패치 | 1-2 | 1-2일 | XSS·오류 상태 E2E PASS |
| 0.2 검증 엔진 | 0, 3-4 | 5-8일 | 정책 승인, KASI fixture 100% PASS |
| 0.3 해석/UX | 5-6 | 3-5일 | axe 0건, 모바일/데스크톱 E2E PASS |
| 1.0 운영 릴리스 | 7 | 1-2일 | CI/Pages/문서/번들 기준 PASS |

총 예상: 개발 10-17일 + 사주 계산 정책 외부 검토 0.5-1일. 정확도 검증에서 절기 시각 차이가 발견되면 공식 override 자료 구축에 1-3일을 추가한다.

## 6. Definition of Done

- [ ] 이름 입력이 어떤 문자열이어도 HTML/스크립트로 실행되지 않는다.
- [ ] 잘못된 날짜·윤달에서 이전 결과가 한 조각도 남지 않는다.
- [ ] 2024년 입춘 17:27 전후의 년주가 KASI 기준으로 바뀐다.
- [ ] 23:29, 23:30, 00:00 야자시 경계가 계산 정책 문서와 일치한다.
- [ ] 성별 미선택 시 대운 방향을 임의로 표시하지 않는다.
- [ ] KASI 일진·음력·절기 fixture가 100% 통과한다.
- [ ] 도메인 계산 모듈 coverage 95% 이상이다.
- [ ] 320px 이상 화면에서 본문 가로 넘침이 없다.
- [ ] 키보드만으로 폼, 탭, 대운 카드, 입력 수정에 접근할 수 있다.
- [ ] axe critical/serious 위반이 0건이다.
- [ ] 사용자 입력이 네트워크로 전송되지 않는다.
- [ ] PR에서 lint, unit, E2E, build가 모두 자동 검증된다.
- [ ] README와 앱 화면의 계산 기준·한계 문구가 일치한다.

## 7. 이번 계획에서 제외하는 후속 후보

다음은 핵심 신뢰성 릴리스가 끝난 후 별도 계획으로 다룬다.

- 출생 시간을 모르는 사용자용 3주 결과와 불확실성 표시
- 출생지·경도·진태양시 보정
- 결과 저장/공유 링크와 PDF 내보내기
- PWA 오프라인 설치
- 계정, 결제, 서버 저장, AI 생성 해석
- 다국어 지원

이 항목들은 계산 정확도, 보안, 테스트, 접근성보다 먼저 구현하지 않는다.

## 8. SELF REFINE 기록

초안은 UI 재설계와 신규 기능까지 한 번에 포함해 범위가 컸다. 아래 기준으로 계획을 다시 다듬었다.

- [x] **Spec coverage:** 사용자가 요청한 “보완점 분석”, “구체적 계획”, “단계별 실행 내용”, “체크 표시”를 각각 1절, 4절, 각 Step, 체크박스로 연결했다.
- [x] **Risk ordering:** UI 개선보다 실제 재현된 XSS·stale state와 절입 정확도를 앞에 배치했다.
- [x] **Scope reduction:** React/Next.js, 백엔드, 계정, 결제, AI 해석을 핵심 계획에서 제거했다.
- [x] **Privacy preservation:** 현행 장점인 클라이언트 전용 계산을 아키텍처 제약으로 고정했다.
- [x] **Accuracy gate:** “정확하게 개선”이라는 모호한 문장을 제거하고 KASI fixture, 입춘 경계, 2분 허용치, 배포 중단 조건을 추가했다.
- [x] **Policy ambiguity:** 야자시, 성별 미선택, 대운 시작 나이를 코드 전에 문서로 확정하도록 Task 0을 추가했다.
- [x] **Maintainability:** 프레임워크 재작성 대신 도메인/DOM 분리와 TypeScript strict 모드로 변경했다.
- [x] **Test consistency:** `BirthInput`, `AppState`, 테스트 명칭과 파일 경로가 후속 Task에서 동일한지 확인했다.
- [x] **Placeholder scan:** 미정 표기와 구체성 없는 후속 구현 표현을 제거했다.
- [x] **Exit criteria:** 각 릴리스와 전체 Definition of Done에 측정 가능한 통과 기준을 부여했다.
- [x] **Source traceability:** 계산 검증 자료를 KASI와 공공데이터포털로 한정하고 fixture마다 URL·조회일을 기록하도록 했다.
- [x] **Chat traceability:** 원채팅 세션의 8칸 명식, 표시 순서, 모바일, 네 해석 탭, 대운, 양음력, 육친·사회·적성 요구를 Task와 회귀 테스트에 연결했다.

### SELF REFINE 후 최종 우선순위

```text
P0 안전성 → 계산 정책 → 테스트 가능한 구조 → 절입/야자시/대운 정확도
→ 해석의 근거와 한계 → 모바일/접근성 → CI/배포 → 신규 기능
```

## 9. 검증 참고 자료

- [한국천문연구원 달력자료(음력·24절기 시각)](https://astro.kasi.re.kr/kor/life/post/calendarData)
- [공공데이터포털 한국천문연구원 음양력 정보 API](https://www.data.go.kr/data/15012679/openapi.do)
- [한국천문연구원 2026년 월력요항 발표](https://www.kasi.re.kr/kor/post/newsMaterial/32031)
- [Astronomy Engine 공식 저장소](https://github.com/cosinekitty/astronomy)
