const stems = [
  { hanja: "甲", ko: "갑", yinYang: "양", element: "목", image: "큰 나무" },
  { hanja: "乙", ko: "을", yinYang: "음", element: "목", image: "덩굴과 풀" },
  { hanja: "丙", ko: "병", yinYang: "양", element: "화", image: "태양" },
  { hanja: "丁", ko: "정", yinYang: "음", element: "화", image: "촛불" },
  { hanja: "戊", ko: "무", yinYang: "양", element: "토", image: "산" },
  { hanja: "己", ko: "기", yinYang: "음", element: "토", image: "밭" },
  { hanja: "庚", ko: "경", yinYang: "양", element: "금", image: "쇠" },
  { hanja: "辛", ko: "신", yinYang: "음", element: "금", image: "보석" },
  { hanja: "壬", ko: "임", yinYang: "양", element: "수", image: "바다" },
  { hanja: "癸", ko: "계", yinYang: "음", element: "수", image: "비" }
];

const branches = [
  { hanja: "子", ko: "자", animal: "쥐", element: "수" },
  { hanja: "丑", ko: "축", animal: "소", element: "토" },
  { hanja: "寅", ko: "인", animal: "호랑이", element: "목" },
  { hanja: "卯", ko: "묘", animal: "토끼", element: "목" },
  { hanja: "辰", ko: "진", animal: "용", element: "토" },
  { hanja: "巳", ko: "사", animal: "뱀", element: "화" },
  { hanja: "午", ko: "오", animal: "말", element: "화" },
  { hanja: "未", ko: "미", animal: "양", element: "토" },
  { hanja: "申", ko: "신", animal: "원숭이", element: "금" },
  { hanja: "酉", ko: "유", animal: "닭", element: "금" },
  { hanja: "戌", ko: "술", animal: "개", element: "토" },
  { hanja: "亥", ko: "해", animal: "돼지", element: "수" }
];

const elements = {
  목: { label: "목", color: "#2f8f7b", trait: "성장, 기획, 배움" },
  화: { label: "화", color: "#d9614c", trait: "표현, 추진, 인기" },
  토: { label: "토", color: "#c4912c", trait: "안정, 신뢰, 중재" },
  금: { label: "금", color: "#7c8791", trait: "판단, 정리, 성과" },
  수: { label: "수", color: "#3d78a7", trait: "지혜, 이동, 회복" }
};

const monthTerms = [
  { month: 1, day: 6, branch: 1 },
  { month: 2, day: 4, branch: 2 },
  { month: 3, day: 6, branch: 3 },
  { month: 4, day: 5, branch: 4 },
  { month: 5, day: 6, branch: 5 },
  { month: 6, day: 6, branch: 6 },
  { month: 7, day: 7, branch: 7 },
  { month: 8, day: 8, branch: 8 },
  { month: 9, day: 8, branch: 9 },
  { month: 10, day: 8, branch: 10 },
  { month: 11, day: 7, branch: 11 },
  { month: 12, day: 7, branch: 0 }
];

const monthStemStarts = [2, 4, 6, 8, 0];
const hourStemStarts = [0, 2, 4, 6, 8];
const form = document.querySelector("#birthForm");
const tabs = document.querySelectorAll(".tab");
let currentChart = null;
let activeTab = "overall";

function mod(value, length) {
  return ((value % length) + length) % length;
}

function sexagenary(index) {
  const stem = stems[mod(index, 10)];
  const branch = branches[mod(index, 12)];
  return {
    index: mod(index, 60),
    stem,
    branch,
    hanja: `${stem.hanja}${branch.hanja}`,
    ko: `${stem.ko}${branch.ko}`
  };
}

function getJulianDay(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function getShiftedDateParts(year, month, day, offsetDays) {
  const date = new Date(year, month - 1, day + offsetDays);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

function getTermDate(year, term) {
  return new Date(year, term.month - 1, term.day);
}

function getAdjacentTerms(year, month, day, hour, minute) {
  const birth = new Date(year, month - 1, day, hour, minute);
  const termDates = [];
  for (let y = year - 1; y <= year + 1; y += 1) {
    for (const term of monthTerms) {
      termDates.push(getTermDate(y, term));
    }
  }
  termDates.sort((a, b) => a - b);
  const prev = [...termDates].reverse().find((date) => date < birth) || termDates[0];
  const next = termDates.find((date) => date > birth) || termDates[termDates.length - 1];
  return { birth, prev, next };
}

function getYearPillar(year, month, day) {
  const sajuYear = month < 2 || (month === 2 && day < 4) ? year - 1 : year;
  return sexagenary(sajuYear - 4);
}

function getMonthPillar(yearPillar, month, day) {
  let term = monthTerms[0];
  for (const candidate of monthTerms) {
    if (month > candidate.month || (month === candidate.month && day >= candidate.day)) {
      term = candidate;
    }
  }
  if (month === 1 && day < 6) {
    term = monthTerms[11];
  }

  const yearStemIndex = stems.indexOf(yearPillar.stem);
  const start = monthStemStarts[yearStemIndex % 5];
  const tigerOffset = mod(term.branch - 2, 12);
  const stemIndex = mod(start + tigerOffset, 10);
  const branchIndex = term.branch;
  return {
    ...sexagenary(findCycleIndex(stemIndex, branchIndex)),
    termBranch: term.branch
  };
}

function getDayPillar(year, month, day) {
  const jdn = getJulianDay(year, month, day);
  return sexagenary(jdn + 49);
}

function getHourPillar(dayPillar, hour) {
  const branchIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  const dayStemIndex = stems.indexOf(dayPillar.stem);
  const start = hourStemStarts[dayStemIndex % 5];
  const stemIndex = mod(start + branchIndex, 10);
  return sexagenary(findCycleIndex(stemIndex, branchIndex));
}

function findCycleIndex(stemIndex, branchIndex) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIndex && i % 12 === branchIndex) {
      return i;
    }
  }
  return 0;
}

function getDaeunDirection(yearPillar, gender) {
  const isYangYear = yearPillar.stem.yinYang === "양";
  if (gender === "male") {
    return isYangYear ? 1 : -1;
  }
  if (gender === "female") {
    return isYangYear ? -1 : 1;
  }
  return isYangYear ? 1 : -1;
}

function getDaeunDirectionLabel(direction, gender) {
  const base = direction === 1 ? "순행" : "역행";
  if (gender === "neutral") {
    return `${base} 임시`;
  }
  return base;
}

function getDaeunStartAge(year, month, day, hour, minute, direction) {
  const { birth, prev, next } = getAdjacentTerms(year, month, day, hour, minute);
  const target = direction === 1 ? next : prev;
  const days = Math.abs(target - birth) / 86400000;
  return Math.max(1, Math.round(days / 3));
}

function buildDaeun(chart, gender) {
  const direction = getDaeunDirection(chart.pillars[0], gender);
  const startAge = getDaeunStartAge(chart.year, chart.month, chart.day, chart.hour, chart.minute, direction);
  const monthIndex = chart.pillars[1].index;
  const cycles = Array.from({ length: 8 }, (_, index) => {
    const pillar = sexagenary(monthIndex + direction * (index + 1));
    const ageStart = startAge + index * 10;
    return {
      ...pillar,
      ageStart,
      ageEnd: ageStart + 9,
      calendarStart: chart.year + ageStart,
      calendarEnd: chart.year + ageStart + 9
    };
  });
  return {
    direction,
    directionLabel: getDaeunDirectionLabel(direction, gender),
    startAge,
    cycles
  };
}

function buildChart(dateValue, timeValue, yajaEnabled = true, gender = "neutral") {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const isYajaRange = hour === 23 && minute >= 30;
  const nextDate = getShiftedDateParts(year, month, day, 1);
  const dayDate = !yajaEnabled && isYajaRange ? nextDate : { year, month, day };
  const hourStemDate = yajaEnabled && isYajaRange ? nextDate : dayDate;
  const yearPillar = getYearPillar(year, month, day);
  const monthPillar = getMonthPillar(yearPillar, month, day);
  const dayPillar = getDayPillar(dayDate.year, dayDate.month, dayDate.day);
  const hourBaseDayPillar = getDayPillar(hourStemDate.year, hourStemDate.month, hourStemDate.day);
  const hourPillar = getHourPillar(hourBaseDayPillar, hour);
  const pillars = [
    { key: "year", label: "년주", hint: "가문과 초년", ...yearPillar },
    { key: "month", label: "월주", hint: "사회와 일", ...monthPillar },
    { key: "day", label: "일주", hint: "나 자신", ...dayPillar },
    { key: "hour", label: "시주", hint: "재능과 미래", ...hourPillar }
  ];

  return {
    year,
    month,
    day,
    hour,
    minute,
    yajaEnabled,
    yajaApplied: yajaEnabled && isYajaRange,
    pillars,
    dayMaster: dayPillar.stem,
    counts: countElements(pillars),
    gender
  };
}

function countElements(pillars) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const pillar of pillars) {
    counts[pillar.stem.element] += 1;
    counts[pillar.branch.element] += 1;
  }
  return counts;
}

function getDominantAndWeak(counts) {
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    dominant: ranked[0][0],
    weak: ranked[ranked.length - 1][0],
    ranked
  };
}

function hasBatchim(text) {
  const last = text.charCodeAt(text.length - 1);
  if (last < 0xac00 || last > 0xd7a3) {
    return false;
  }
  return (last - 0xac00) % 28 !== 0;
}

function subjectParticle(text) {
  return hasBatchim(text) ? "이" : "가";
}

function objectParticle(text) {
  return hasBatchim(text) ? "을" : "를";
}

function displayName() {
  const name = document.querySelector("#name").value.trim();
  return name ? `${name}님` : "당신";
}

function renderChart(chart) {
  const name = displayName();
  const focus = document.querySelector("#focus").value;
  const { dominant, weak } = getDominantAndWeak(chart.counts);

  const yajaLabel = chart.yajaApplied ? " · 야자시 적용" : chart.yajaEnabled ? " · 야자시 대기" : "";
  document.querySelector("#resultKicker").textContent = `${chart.year}.${String(chart.month).padStart(2, "0")}.${String(chart.day).padStart(2, "0")} ${String(chart.hour).padStart(2, "0")}:${String(chart.minute).padStart(2, "0")}${yajaLabel}`;
  document.querySelector("#resultTitle").textContent = `${name}의 중심 기운은 ${chart.dayMaster.hanja}(${chart.dayMaster.ko}) ${chart.dayMaster.element}입니다`;
  document.querySelector("#dayMasterBadge").textContent = `${chart.dayMaster.ko.toUpperCase()} ${chart.dayMaster.element}`;

  const displayPillars = [...chart.pillars].reverse();
  document.querySelector("#pillarGrid").innerHTML = displayPillars
    .map(
      (pillar) => `
        <div class="pillar-title">${pillar.label}</div>
      `
    )
    .join("") + displayPillars
    .map(
      (pillar) => `
        <article class="palja-cell" data-element="${pillar.stem.element}">
          <span>천간 · ${pillar.stem.ko}</span>
          <strong>${pillar.stem.hanja}</strong>
          <small>${pillar.stem.element} · ${pillar.stem.yinYang}</small>
        </article>
      `
    )
    .join("") + displayPillars
    .map(
      (pillar) => `
        <article class="palja-cell" data-element="${pillar.branch.element}">
          <span>지지 · ${pillar.branch.ko}</span>
          <strong>${pillar.branch.hanja}</strong>
          <small>${pillar.branch.element} · ${pillar.branch.animal}</small>
        </article>
      `
    )
    .join("");

  document.querySelector("#balanceSummary").textContent = `${dominant} 강함 · ${weak} 보완`;
  renderBars(chart.counts);
  renderDaeun(chart);
  activeTab = focus === "mind" ? "overall" : focus;
  setActiveTab(activeTab);
}

function getCurrentAge(chart) {
  const today = new Date();
  let age = today.getFullYear() - chart.year;
  const birthdayPassed = today.getMonth() + 1 > chart.month || (today.getMonth() + 1 === chart.month && today.getDate() >= chart.day);
  if (!birthdayPassed) {
    age -= 1;
  }
  return age;
}

function daeunReading(pillar, chart) {
  const stemElement = pillar.stem.element;
  const branchElement = pillar.branch.element;
  if (stemElement === chart.dayMaster.element || branchElement === chart.dayMaster.element) {
    return "자기 색이 강해지는 시기라 주도권을 잡기 쉽습니다.";
  }
  if (chart.counts[stemElement] === 0 || chart.counts[branchElement] === 0) {
    return "부족한 기운을 채워주는 흐름이라 환경 변화가 도움이 됩니다.";
  }
  return "기존 흐름을 조정하며 현실적인 선택이 중요해지는 시기입니다.";
}

function renderDaeun(chart) {
  const daeun = buildDaeun(chart, chart.gender);
  const currentAge = getCurrentAge(chart);
  const genderNote = chart.gender === "neutral" ? "성별 미선택: 연간 음양 기준 임시 표시" : "성별과 연간 음양 기준";
  document.querySelector("#daeunSummary").textContent = `${daeun.directionLabel} · ${daeun.startAge}세 시작`;
  document.querySelector("#daeunNote").textContent = `${genderNote}. 절기일은 근사값이며, 전문 만세력과 1세 안팎 차이가 날 수 있습니다.`;
  document.querySelector("#daeunList").innerHTML = daeun.cycles
    .map((cycle) => {
      const isActive = currentAge >= cycle.ageStart && currentAge <= cycle.ageEnd;
      return `
        <article class="daeun-card${isActive ? " active" : ""}">
          <div>
            <span>${cycle.ageStart}-${cycle.ageEnd}세</span>
            <strong>${cycle.hanja}</strong>
            <em>${cycle.ko} · ${cycle.stem.element}/${cycle.branch.element}</em>
          </div>
          <p>${cycle.calendarStart}-${cycle.calendarEnd}</p>
          <small>${daeunReading(cycle, chart)}</small>
        </article>
      `;
    })
    .join("");
}

function renderBars(counts) {
  const max = Math.max(...Object.values(counts), 1);
  document.querySelector("#elementBars").innerHTML = Object.entries(elements)
    .map(([key, info]) => {
      const value = counts[key];
      const width = value === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
      return `
        <div class="element-row">
          <strong>${info.label}</strong>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${width}%; background: ${info.color};"></div>
          </div>
          <span>${value}</span>
        </div>
      `;
    })
    .join("");
}

function setActiveTab(tabName) {
  activeTab = tabName;
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  if (currentChart) {
    document.querySelector("#readingText").innerHTML = getReading(currentChart, tabName);
  }
}

function sentenceForElement(element) {
  return {
    목: "새로운 판을 읽고 키우는 감각이 좋아서, 배움과 기획에서 운이 열립니다.",
    화: "사람 앞에 설수록 빛이 살아나며, 표현력과 속도감이 강점으로 작동합니다.",
    토: "흔들리는 상황을 붙잡아 현실로 만드는 힘이 있어, 신뢰를 쌓을수록 커집니다.",
    금: "기준을 세우고 정리하는 능력이 선명해, 선택과 성과의 운을 잘 다룹니다.",
    수: "흐름을 읽고 우회로를 찾는 재치가 있어, 정보와 이동에서 기회가 생깁니다."
  }[element];
}

function supportElement(element) {
  return {
    목: "초록 계열, 산책, 기록 습관",
    화: "붉은 계열, 발표, 오전 루틴",
    토: "노란 계열, 정리, 꾸준한 식사 리듬",
    금: "흰색 계열, 숫자 관리, 마감 설정",
    수: "검정과 파랑, 수면 회복, 조용한 공부"
  }[element];
}

function relationTip(dayElement, weakElement) {
  if (dayElement === weakElement) {
    return "관계에서는 내 속도를 설명하는 말이 중요합니다. 상대가 알아서 맞추길 기다리기보다 기준을 짧게 말하면 오해가 줄어듭니다.";
  }
  return `부족한 ${weakElement} 기운을 가진 사람이나 환경이 귀인이 되기 쉽습니다. 낯선 조언을 바로 밀어내지 않을 때 관계운이 살아납니다.`;
}

function yearlyPillar(year) {
  return sexagenary(year - 4);
}

function elementAdvice(element) {
  return {
    목: "목은 방향을 세우고 키우는 힘입니다. 계획을 작게 쪼개어 매일 자라나는 방식으로 움직일 때 운이 붙습니다.",
    화: "화는 드러내고 연결하는 힘입니다. 말, 발표, 홍보, 콘텐츠처럼 밖으로 보이는 활동을 할수록 기회가 빠르게 열립니다.",
    토: "토는 받아들이고 안정시키는 힘입니다. 사람 사이의 조율, 관리, 부동산, 운영처럼 중심을 잡는 역할에서 신뢰를 얻습니다.",
    금: "금은 자르고 정리하는 힘입니다. 기준을 세우고 불필요한 것을 덜어내면 성과와 돈의 흐름이 또렷해집니다.",
    수: "수는 흐르고 축적하는 힘입니다. 공부, 정보, 이동, 상담, 연구처럼 깊이 파고드는 일에서 장기 운이 만들어집니다."
  }[element];
}

function excessCaution(element) {
  return {
    목: "목이 과하면 시작은 많은데 마무리가 약해질 수 있습니다. 약속한 일의 끝 날짜를 먼저 정하면 기운이 흩어지지 않습니다.",
    화: "화가 과하면 반응이 빠른 대신 쉽게 지칠 수 있습니다. 중요한 말은 한 번 쉬었다가 전하면 손실을 줄입니다.",
    토: "토가 과하면 안전한 선택만 반복하기 쉽습니다. 정리와 보류가 길어질 때는 작은 실행으로 흐름을 깨야 합니다.",
    금: "금이 과하면 기준이 날카로워져 관계가 건조해질 수 있습니다. 완벽한 답보다 합의 가능한 답을 찾는 연습이 좋습니다.",
    수: "수가 과하면 생각이 깊어져도 결정이 늦어질 수 있습니다. 정보 수집 시간을 제한하면 운이 현실로 내려옵니다."
  }[element];
}

function careerMode(element) {
  return {
    목: "기획, 교육, 브랜딩, 성장 산업처럼 계속 확장되는 일과 잘 맞습니다.",
    화: "영업, 마케팅, 콘텐츠, 발표, 서비스처럼 사람의 반응을 직접 받는 일이 좋습니다.",
    토: "운영, 관리, 중개, 상담, 재무 계획처럼 신뢰와 반복이 쌓이는 일에서 강합니다.",
    금: "분석, 법무, 회계, 품질관리, 디자인 정리처럼 기준과 완성도가 필요한 일에 강점이 있습니다.",
    수: "연구, 데이터, 유통, 해외, 글쓰기, 심리 상담처럼 정보와 흐름을 다루는 일이 맞습니다."
  }[element];
}

function loveMode(element) {
  return {
    목: "관계에서는 함께 성장한다는 느낌이 중요합니다. 상대가 내 가능성을 막는다고 느끼면 마음이 빨리 닫힙니다.",
    화: "관계에서는 온도와 표현이 중요합니다. 좋아하는 마음을 숨기기보다 적당히 드러낼 때 매력이 살아납니다.",
    토: "관계에서는 안정감과 책임감이 중요합니다. 급격한 변화보다 꾸준한 확인이 애정 표현이 됩니다.",
    금: "관계에서는 예의와 선이 중요합니다. 정확한 약속과 배려 있는 거리감이 오래가는 힘입니다.",
    수: "관계에서는 대화의 깊이와 편안함이 중요합니다. 속마음을 천천히 나눌 수 있는 상대에게 마음이 열립니다."
  }[element];
}

function timingGuide(element) {
  return {
    목: "봄처럼 새로 시작하는 기운이 들어올 때는 공부, 계약 전 준비, 포트폴리오 정리에 유리합니다.",
    화: "여름처럼 뜨거운 기운이 들어올 때는 발표, 소개, 영업, 공개 제안에 유리합니다.",
    토: "환절기처럼 정리하는 기운이 들어올 때는 자산 점검, 역할 조정, 관계 재정비가 좋습니다.",
    금: "가을처럼 결실을 거두는 기운이 들어올 때는 협상, 마감, 평가, 돈의 기준 세우기에 유리합니다.",
    수: "겨울처럼 저장하는 기운이 들어올 때는 공부, 회복, 장기 계획, 조용한 준비에 유리합니다."
  }[element];
}

function getReading(chart, tabName) {
  const name = displayName();
  const { dominant, weak } = getDominantAndWeak(chart.counts);
  const dayElement = chart.dayMaster.element;
  const currentYear = new Date().getFullYear();
  const yearFlow = yearlyPillar(currentYear);
  const balanceLine = `${dominant} 기운이 가장 두드러지고 ${weak} 기운은 의식적으로 보완하면 좋습니다. 보완 키워드는 ${supportElement(weak)}입니다.`;
  const dominantSubject = `${dominant}${subjectParticle(dominant)}`;
  const weakObject = `${weak}${objectParticle(weak)}`;
  const yearPillar = chart.pillars[0];
  const monthPillar = chart.pillars[1];
  const dayPillar = chart.pillars[2];
  const hourPillar = chart.pillars[3];

  const readings = {
    overall: `
      <p>${name}은 ${chart.dayMaster.image} 같은 ${chart.dayMaster.ko} 일간입니다. ${sentenceForElement(dayElement)}</p>
      <p>${balanceLine} 강한 기운은 재능이지만 과하면 고집이 되니, 약한 기운을 생활 습관으로 채우는 쪽이 가장 빠릅니다.</p>
      <p>년주 ${yearPillar.hanja}는 바깥에 보이는 첫인상과 초년의 바탕을 보여줍니다. ${yearPillar.stem.element}의 천간과 ${yearPillar.branch.element}의 지지가 함께 있어, 처음에는 주변 환경의 영향을 받지만 시간이 갈수록 자기 방식이 분명해지는 구조입니다.</p>
      <p>월주 ${monthPillar.hanja}는 사회에서 쓰는 힘입니다. 월주의 ${monthPillar.stem.element} 기운은 일과 대인관계에서 반복적으로 드러나므로, 직업 선택이나 생활 리듬을 볼 때 가장 현실적인 힌트가 됩니다.</p>
      <p>일주 ${dayPillar.hanja}는 가까운 사람 앞에서의 본모습입니다. 겉으로는 다르게 보여도 결정적인 순간에는 ${dayElement} 일간의 방식으로 판단하고 움직입니다.</p>
      <p>시주 ${hourPillar.hanja}는 재능의 방향과 후반 운을 봅니다. 지금 당장 성과가 작아 보여도 시주의 ${hourPillar.branch.element} 기운을 꾸준히 쓰면 시간이 지나며 자기만의 무기가 됩니다.</p>
      <p>${elementAdvice(dayElement)} 다만 ${excessCaution(dominant)}</p>
    `,
    career: `
      <p>일운은 월주 ${monthPillar.hanja}의 영향을 크게 받습니다. ${monthPillar.stem.element} 기운이 일의 방식에 깔려 있어, 성과는 속도보다 구조를 만들 때 안정됩니다.</p>
      <p>${dominantSubject} 강한 날에는 밀어붙이고, ${weakObject} 보완하는 날에는 정리와 협업을 잡는 흐름이 좋습니다.</p>
      <p>직업적으로는 일간의 ${dayElement} 기운을 억지로 바꾸기보다 잘 쓰는 편이 좋습니다. ${careerMode(dayElement)}</p>
      <p>월주의 지지 ${monthPillar.branch.hanja}(${monthPillar.branch.ko})는 실제 현장에서 반복되는 환경을 뜻합니다. ${monthPillar.branch.element} 기운이 강한 일터에서는 익숙함을 빨리 얻고, 반대로 부족한 ${weak} 기운을 요구하는 일터에서는 처음에 피로가 커질 수 있습니다.</p>
      <p>돈의 흐름은 강한 오행을 바로 쓰는 방식보다 약한 오행을 보완할 때 안정됩니다. 예를 들어 ${weak} 기운이 약하다면, ${supportElement(weak)} 같은 습관을 통해 판단의 빈틈을 줄이는 것이 재물운 관리에 도움이 됩니다.</p>
      <p>일에서 중요한 선택을 앞두고 있다면 속도보다 기준을 먼저 잡으세요. 맡을 일, 거절할 일, 나중에 볼 일을 구분하면 ${dominant}의 장점은 살아나고 과한 기운은 줄어듭니다.</p>
      <p>올해 ${yearFlow.hanja}의 ${yearFlow.stem.element}/${yearFlow.branch.element} 기운은 기존 방식에 변화를 줍니다. 큰 방향은 유지하되, 사람을 만나는 방식이나 돈을 기록하는 방식은 새롭게 바꾸는 쪽이 좋습니다.</p>
    `,
    love: `
      <p>${relationTip(dayElement, weak)}</p>
      <p>일주 ${dayPillar.hanja}는 가까운 관계에서 드러나는 모습입니다. 마음이 급할수록 한 번 쉬고 말하면 매력이 더 선명하게 전달됩니다.</p>
      <p>${loveMode(dayElement)}</p>
      <p>관계운에서 가장 중요한 것은 오행의 균형입니다. ${dominant} 기운이 강하면 내 방식이 선명해지는 대신 상대가 숨 쉴 공간이 줄어들 수 있고, ${weak} 기운이 약하면 정작 필요한 표현이나 확인을 놓치기 쉽습니다.</p>
      <p>좋은 인연은 부족한 ${weak} 기운을 무리 없이 채워주는 사람에게서 오기 쉽습니다. 그 사람은 반드시 성격이 정반대라는 뜻은 아니고, 내가 잘 못 보는 관점과 리듬을 자연스럽게 가져오는 사람일 수 있습니다.</p>
      <p>연애나 부부 관계에서는 시주 ${hourPillar.hanja}도 중요합니다. 시주는 시간이 지날수록 드러나는 관계의 습관을 보여주므로, 처음의 설렘보다 함께 생활할 때의 대화 방식과 약속 이행을 보는 편이 정확합니다.</p>
      <p>지금 관계가 흔들린다면 크게 결론내리기보다 말의 순서를 바꾸는 것이 먼저입니다. 감정, 이유, 원하는 행동을 따로 말하면 오해가 줄고 관계의 회복 속도도 빨라집니다.</p>
    `,
    timing: `
      <p>${currentYear}년의 흐름은 ${yearFlow.hanja}(${yearFlow.ko})입니다. 올해 들어오는 ${yearFlow.stem.element}/${yearFlow.branch.element} 기운은 ${dayElement} 일간에게 새로운 균형점을 요구합니다.</p>
      <p>중요한 결정은 ${dominant} 기운이 과열될 때보다 ${weak}을 채운 뒤가 좋습니다. 특히 달력에 적고 확인하는 행동이 운을 현실로 붙잡습니다.</p>
      <p>${timingGuide(yearFlow.stem.element)} 올해의 천간 ${yearFlow.stem.hanja}는 겉으로 드러나는 사건의 색이고, 지지 ${yearFlow.branch.hanja}는 실제 생활에서 반복되는 분위기입니다.</p>
      <p>새로운 일을 시작할 때는 ${dayElement} 일간의 장점을 먼저 쓰세요. ${elementAdvice(dayElement)} 시작 후에는 부족한 ${weak} 기운을 보완해야 오래 갑니다.</p>
      <p>좋은 시기는 대개 기운이 강해지는 때가 아니라 균형이 맞는 때입니다. ${dominant}이 이미 강하다면 같은 기운이 더 들어오는 시기에는 욕심을 줄이고, ${weak}이 들어오는 시기에는 사람을 만나거나 중요한 제안을 꺼내기 좋습니다.</p>
      <p>이동, 이직, 계약, 고백처럼 방향을 바꾸는 일은 하루 기분보다 준비 상태를 기준으로 보세요. 준비가 70% 이상이고 마음이 과열되지 않았을 때가 가장 안정적입니다.</p>
      <p>운을 좋게 쓰는 방법은 거창하지 않습니다. 기록하고, 반복하고, 약한 오행을 생활에 넣는 것부터 시작하면 됩니다. ${supportElement(weak)}을 작은 루틴으로 만들면 시기의 도움을 더 잘 받습니다.</p>
    `
  };

  return readings[tabName];
}

function setDefaultDate() {
  const input = document.querySelector("#birthDate");
  if (!input.value) {
    input.value = "1995-05-15";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateChartFromInputs();
});

document.querySelector("#yajaTime").addEventListener("change", updateChartFromInputs);
document.querySelector("#gender").addEventListener("change", updateChartFromInputs);

function updateChartFromInputs() {
  const dateValue = document.querySelector("#birthDate").value;
  const timeValue = document.querySelector("#birthTime").value;
  const yajaEnabled = document.querySelector("#yajaTime").checked;
  const gender = document.querySelector("#gender").value;
  if (!dateValue || !timeValue) {
    return;
  }
  currentChart = buildChart(dateValue, timeValue, yajaEnabled, gender);
  renderChart(currentChart);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
});

setDefaultDate();
currentChart = buildChart(document.querySelector("#birthDate").value, document.querySelector("#birthTime").value, document.querySelector("#yajaTime").checked, document.querySelector("#gender").value);
renderChart(currentChart);
