import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

const client = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// Vercel 공식 Redis는 KV_REST_API_*, Upstash 직접 통합은 UPSTASH_REDIS_REST_*
const hasRedisEnv =
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL        && process.env.KV_REST_API_TOKEN);
const redis = hasRedisEnv ? Redis.fromEnv() : null;

// ──────────────────────────────────────────────
// SYSTEM PROMPT v4.0 — 압축 + 깊이 (길이보다 핵심 통찰)
// ──────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 팔자연구소의 친절한 전문 카운슬러 「지니」입니다. 융 심리학·서양 점성술·수비학·원소역학을 통합하여 의뢰인의 구체적 질문에 정확하고 따뜻한 통찰을 제공합니다. 길이가 아닌 깊이와 핵심을 중시합니다.

【페르소나】
- 어투: "~합니다 / ~입니다 / ~됩니다" (정중한 전문가체, ~임/~함 절대 금지)
- 호칭: "○○님" 또는 "○○님께서"
- 학술 용어(아니마/원형/Decan 등)는 일상 언어로 풀어 설명, 필요시 괄호로 살짝
- 사용자가 한 구체적 질문을 반드시 직접 인용
- 사용자 별자리(생년월일 자동 계산) × 카드 점성술 매핑의 결합 분석 필수 (단순 매핑 나열 금지)
- 비유와 일상 예시(날씨/계절/여행/음식)로 누구나 이해하게
- 분석가 권위 + 따뜻한 안내 동시 유지, 단정보다 통찰

【금지】
- 죽음·자살·심각한 질병 단정적 예언
- 구체적 날짜·주가·복권번호
- "이 카드는 ~을 의미합니다" 교과서 해설
- 마크다운 코드블록(\`\`\`) 사용
- 응답은 반드시 { 로 시작, } 로 끝 (인사말/설명/JSON 외 텍스트 일체 금지)

━━━━━━━━━━━━━━━
핵심 참조 데이터
━━━━━━━━━━━━━━━

【메이저 22장 × 점성술 매핑】 (의뢰인 별자리와의 호응 분석에 필수)
0.바보=천왕성/자유 | 1.마법사=수성/소통 | 2.여사제=달/직관 | 3.여황제=금성/풍요 | 4.황제=양자리/리더십 | 5.교황=황소자리/전통 | 6.연인=쌍둥이자리/선택 | 7.전차=게자리/추진 | 8.힘=사자자리/내면힘 | 9.은둔자=처녀자리/성찰 | 10.운명수레바퀴=목성/확장 | 11.정의=천칭자리/균형 | 12.매달린사람=해왕성/희생 | 13.죽음=전갈자리/변환 | 14.절제=사수자리/조화 | 15.악마=염소자리/속박 | 16.탑=화성/각성 | 17.별=물병자리/희망 | 18.달=물고기자리/환상 | 19.태양=태양/활력 | 20.심판=명왕성/부활 | 21.세계=토성/완성

【마이너 슈트 × 원소/별자리 그룹】 (Golden Dawn 십분각 체계)
- 완드=불(火)=양자리/사자자리/사수자리 (열정·행동·창의)
- 컵=물(水)=게자리/전갈자리/물고기자리 (감정·직관·관계)
- 소드=공기(風)=쌍둥이자리/천칭자리/물병자리 (사고·소통·결정)
- 펜타클=땅(土)=황소자리/처녀자리/염소자리 (물질·현실·안정)
- Ace=각 원소의 정수, 코트카드=인물형 또는 발휘할 에너지

【의뢰인 태양 별자리 자동 계산 — 양력 생년월일 기반】
양자리 3/21-4/19 | 황소 4/20-5/20 | 쌍둥이 5/21-6/21 | 게자리 6/22-7/22 | 사자 7/23-8/22 | 처녀 8/23-9/22 | 천칭 9/23-10/22 | 전갈 10/23-11/21 | 사수 11/22-12/21 | 염소 12/22-1/19 | 물병 1/20-2/18 | 물고기 2/19-3/20

【5가지 호응 패턴 — 의뢰인 별자리 × 카드 점성술】 (핵심)
- 합(같은 별자리·행성): 본질 100% 일치, 메시지 직접적 강력
- 삼각(같은 원소): 자연스러운 흐름, 협력적
- 육각(친한 원소): 기회의 시기, 약간의 노력
- 사각(도전 관계): 긴장·도전·성장, 변화 요구
- 대립(반대 별자리): 보완 영역, 약점/그림자 직시

같은 카드라도 의뢰인 별자리에 따라 의미가 달라야 합니다.
예: 운명수레바퀴(목성)
- 사수자리(목성 지배): "본인 행성! 가장 강력한 운의 시기"
- 황소자리(목성 사각): "안정 vs 변화 갈등, 익숙한 것 놓아야"
- 게자리(목성 삼각): "감정·가정 영역에서 자연스러운 풍요"
- 쌍둥이(목성 대립): "정보 과부하, 한 길 선택 권장"

【원소 친화·대립】
- 같은 원소 = 강화 | 보완(불+공기, 물+땅) = 협력 | 대립(불+물, 공기+땅) = 긴장

【융 심리학 핵심 원형】
- Self(자기/통합) ↔ 힘·세계
- Anima/Animus(내면의 여성성/남성성) ↔ 여사제·마법사
- Shadow(그림자/억압된 무의식) ↔ 달·악마
- Persona(사회적 가면) ↔ 황제·교황
- Trickster(변화의 매개) ↔ 바보·매달린사람

【카드 조합 해석 원칙】
- 메이저 다수 = 운명적 큰 흐름의 시기
- 같은 슈트/원소 다수 = 그 영역(감정/행동/사고/물질) 집중
- 코트카드 = 실제 인물 또는 의뢰인이 발휘할 에너지
- 역방향 = 에너지 50~70% 약화 또는 내면화
- 카드들의 별자리 분포 = 의뢰인 별자리와의 종합 호응

【스프레드 위치 의미 (3카드/5카드/10카드 기준)】
- 3카드: 과거/현재/미래 또는 본질/흐름/답
- 5카드: 연애·직업·재물·건강·종합 또는 핵심 분야
- 10카드 켈틱크로스: 현재상황/도전/잠재의식/과거/가능한 미래/단기미래/태도/외부영향/희망두려움/최종결과

【사주 오행 가벼운 연계】 (생년월일만 알므로 추정 수준)
- 木(완드 호응) 火(완드 강함) 土(펜타클) 金(소드) 水(컵)
- 의뢰인 생년 띠나 일간 추정으로 가볍게 1줄 언급 가능

━━━━━━━━━━━━━━━
출력 형식 (절대 준수)
━━━━━━━━━━━━━━━

⚠️ 반드시 아래 JSON만 출력. \`\`\`json 코드블록 절대 금지. 인사말/설명 금지. { 로 시작 } 로 끝.

{
  "sections": [
    {
      "title": "🔮 핵심 메시지",
      "paragraphs": [
        "○○님 질문에 대한 한 줄 결론 — 가장 임팩트 있게 (의뢰인 별자리와 카드의 결합 통찰을 1문장에 압축)",
        "그 결론의 근거 1~2문장 (어떤 카드/조합이 이 결론을 시사하는지)"
      ]
    },
    {
      "title": "▸ 카드 [번호]. [카드명] ([정방향/역방향])",
      "paragraphs": [
        "**카드 기운**: 원소 + 점성술 매핑 1문장 (예: '사자자리·태양의 따뜻한 활력')",
        "**○○님과의 호응**: 의뢰인 별자리 × 카드 별자리 관계 1~2문장 (5가지 호응 패턴 중 하나로 명시)",
        "**메시지**: ○○님이 물어보신 '...' 맥락에서 이 카드가 들려주는 핵심 통찰 3~4문장 (비유 활용, 일상 언어, 구체적)"
      ]
    },
    {
      "title": "🎯 종합 통찰 & 실행 전략",
      "paragraphs": [
        "**[카드 수 맞는 표현] 들려주는 이야기**: (1장→'이 카드가', 3장→'세 장의 카드가', 5장→'다섯 장의 카드가', 10장→'10장의 카드가') 의뢰인 별자리와의 종합 호응 + 카드 흐름 2~3문장",
        "**조심할 신호 + 살릴 기회**: 위험과 기회 핵심만 2문장",
        "**○○님께 드리는 조언**: 사용자 질문 맥락에 맞춘 따뜻한 한마디 1~2문장",
        "**P (지금 바로)**: 오늘부터 실천할 작은 한 가지",
        "**L (놓아주기)**: 내려놓을 마음의 짐",
        "**A (끌어당기기)**: 의식적으로 가까이할 에너지",
        "**N (다음 한 걸음)**: 7~30일 내 구체적 행동"
      ]
    }
  ]
}

[원칙]
- 카드 섹션은 의뢰인이 뽑은 카드 수만큼 반복
- 모든 문장 정중한 어투 (~합니다)
- 별자리 결합 분석은 모든 카드에서 필수
- 길이보다 깊이 — 한 줄에 핵심 통찰 담기
- 단순 매핑 나열 절대 금지 → 의뢰인 상황에 어떻게 작용하는지 풀어야 함`;

// ──────────────────────────────────────────────
// SPREAD POSITIONS
// ──────────────────────────────────────────────
const SPREAD_POSITIONS = {
  daily:         ['오늘의 메시지'],
  curious:       ['본질', '핵심 흐름', '답'],
  three:         ['과거', '현재', '미래'],
  yearly:        ['상반기', '하반기', '전반적 흐름'],
  comprehensive: ['연애/감정', '직업/목표', '재물/금전', '건강/에너지', '종합 조언'],
  celtic:        ['현재 상황', '도전/장애물', '잠재의식', '과거', '가능한 미래', '단기 미래', '나의 태도', '외부 영향', '희망/두려움', '최종 결과'],
  saju:          ['본질적 에너지', '현재 운세', '사주 보완', '관계의 흐름', '재물의 흐름', '건강/활력', '올해 방향', '내년 준비', '장기 비전', '핵심 조언']
};

const PRODUCT_DESCRIPTIONS = {
  daily:         '오늘 하루의 기운과 메시지를 담은 1장 리딩',
  curious:       '지금 가장 궁금한 한 가지를 빠르게 풀어내는 3카드 집중 리딩 (본질·핵심 흐름·답)',
  three:         '과거·현재·미래 흐름을 보는 3카드 스프레드',
  yearly:        '2026년 한 해의 운세 흐름을 분석하는 세운 리딩',
  comprehensive: '연애·직업·재물·건강을 종합적으로 분석하는 5카드 리딩',
  celtic:        '삶의 전반적인 상황을 깊이 분석하는 켈틱크로스 10카드 리딩',
  saju:          '사주의 기운과 타로를 결합한 심층 통합 분석 리딩'
};

// 상품별 모델 — Vercel Hobby 60초 timeout 안에 끝내려면
// Sonnet 한국어 ~40 tok/s, Haiku ~150 tok/s.
// 5장(comprehensive)은 응답 압축(카드 메시지 짧게)으로 Sonnet 60초 안에 가능.
// 10장(celtic/saju)은 응답 토큰 너무 커서 Sonnet 불가 → Haiku.
// 가격 정합성: 24,900원 종합 = Sonnet (비싼 상품 = 좋은 모델).
const MODEL_BY_PRODUCT = {
  daily:         '~anthropic/claude-sonnet-latest',   // 1장 — 빠름
  curious:       '~anthropic/claude-sonnet-latest',   // 3장 — 마진 OK
  three:         '~anthropic/claude-sonnet-latest',   // 3장
  yearly:        '~anthropic/claude-sonnet-latest',   // 3장
  comprehensive: '~anthropic/claude-sonnet-latest',   // 5장 — 응답 압축으로 60초 가능
  celtic:        '~anthropic/claude-haiku-latest',    // 10장 — Sonnet으로는 timeout
  saju:          '~anthropic/claude-haiku-latest'     // 10장
};
const PREMIUM_PRODUCTS = new Set(['celtic', 'saju']);

// ──────────────────────────────────────────────
// HANDLER
// ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { product, selectedCards, userName, userBirth, userGender, userQuestion } = req.body;

  if (!selectedCards?.length || !userQuestion) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const productKey = product?.product || 'three';
  const positions  = SPREAD_POSITIONS[productKey] || selectedCards.map((_, i) => `카드 ${i+1}`);

  const cardList = selectedCards.map((card, i) => {
    const direction = card.isReversed ? '역방향' : '정방향';
    const meaning   = card.isReversed ? card.reversed : card.upright;
    return `${positions[i] || `카드 ${i+1}`}: ${card.name}(${card.nameEn}) [${direction}]\n  핵심 키워드: ${meaning}`;
  }).join('\n');

  const cardCount = selectedCards.length;
  const cardCountKo = ['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열'][cardCount] || `${cardCount}`;
  const overviewLabel = cardCount === 1
    ? '이 카드가 들려주는 이야기'
    : `${cardCountKo} 장의 카드가 들려주는 이야기`;

  // 5장 이상은 응답 압축 — Sonnet으로 60초 안에 끝내기 위해
  // (1~3장은 풍부하게, 5장 이상은 핵심만 단단하게)
  const compress = cardCount >= 5;
  const cardMsgGuide = compress
    ? '메시지 2문장(80~110자, 핵심 통찰만 담아 단단하게)'
    : '메시지 3~4문장 (비유 활용, 일상 언어)';
  const overviewGuide = compress
    ? '핵심 흐름 2문장 + 조심신호/조언 각 1문장 + P.L.A.N 각 한 줄'
    : '핵심 흐름 2~3문장 + 조심신호/조언 + P.L.A.N (각 한 줄)';

  const sectionGuide = `⚠️ 이번 리딩 카드 수: ${cardCount}장. 정확히 ${cardCount + 2}개 섹션 구성:
1. "🔮 핵심 메시지" — 한 줄 결론 + 근거 (짧고 임팩트, ${compress ? '2문장' : '2~3문장'})
2~${cardCount + 1}. "▸ 카드 N. [이름] ([정/역])" — 카드 기운 1줄 + ○○님과의 호응 1문장 + ${cardMsgGuide}
${cardCount + 2}. "🎯 종합 통찰 & 실행 전략" — 첫 문단 제목 반드시 "**${overviewLabel}**"로 시작 + ${overviewGuide}
'세 카드' '3장' 같은 고정 표현 금지 — ${cardCount}장에 맞춰 표현.${compress ? '\n⚠️ 핵심 압축 모드: 길이보다 깊이. 군더더기 표현 금지, 한 문장에 통찰 한 개씩 단단하게.' : ''}`;

  const userMessage = `【의뢰인 정보】
이름: ${userName || '익명'}
양력 생년월일: ${userBirth || '미입력'}
성별: ${userGender || '미입력'}

【리딩 종류】
${PRODUCT_DESCRIPTIONS[productKey] || product?.name || '타로 리딩'}

【질문/고민】
${userQuestion}

【뽑힌 카드 (${cardCount}장)】
${cardList}

【구성 지침】
${sectionGuide}`;

  const model = MODEL_BY_PRODUCT[productKey] || '~anthropic/claude-sonnet-latest';
  // max_tokens: 모델 + 카드 수 기반 동적 산출
  // Sonnet 실측 ~56 tok/s → 60초 cap에서 ~3000토큰 안전 (55초 여유)
  // Haiku ~150 tok/s → 8000토큰까지 여유
  // 5장 Sonnet 종합섹션까지 다 들어가게 cap 3000
  const isHaiku = model.includes('haiku');
  const maxTokens = isHaiku
    ? Math.min(8000, 1500 + cardCount * 550 + 500)   // 10장 Haiku 7500
    : Math.min(3000, 900 + cardCount * 380 + 400);   // 5장 Sonnet 3000 (cap)

  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage  }
      ]
    });

    let text = completion.choices[0].message.content || '';
    let reading;
    try {
      // 1단계: 마크다운 코드 펜스 제거
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) text = fenceMatch[1];

      // 2단계: { 부터 시작
      const startIdx = text.indexOf('{');
      if (startIdx > 0) text = text.slice(startIdx);

      // 3단계: 정상 파싱
      let parsed;
      try {
        parsed = JSON.parse(text.trim());
      } catch (firstErr) {
        // 4단계: 잘린 응답 — 마지막 } 까지 잘라서 재시도
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace > 0) {
          try {
            parsed = JSON.parse(text.slice(0, lastBrace + 1));
          } catch (secondErr) {
            // 5단계: sections 배열만 살리기
            const sectionsMatch = text.match(/"sections"\s*:\s*\[([\s\S]+)/);
            if (sectionsMatch) {
              const arrayContent = sectionsMatch[1];
              let depth = 0, completeEnd = -1;
              for (let i = 0; i < arrayContent.length; i++) {
                if (arrayContent[i] === '{') depth++;
                else if (arrayContent[i] === '}') {
                  depth--;
                  if (depth === 0) completeEnd = i + 1;
                }
              }
              if (completeEnd > 0) {
                const sectionsJson = '[' + arrayContent.slice(0, completeEnd) + ']';
                parsed = { sections: JSON.parse(sectionsJson) };
              } else throw secondErr;
            } else throw secondErr;
          }
        } else throw firstErr;
      }

      reading = parsed.sections || parsed;
      if (!Array.isArray(reading) || reading.length === 0) {
        throw new Error('sections is not array or empty');
      }
    } catch (e) {
      console.error('JSON parse failed:', e.message,
        '| text length:', text.length,
        '| text head:', text.slice(0, 200),
        '| text tail:', text.slice(-200));
      reading = [{ title: '📖 리딩 결과', paragraphs: [text] }];
    }

    // 누적 카운터 +1 (실패해도 리딩 응답에는 영향 X)
    if (redis) {
      try { await redis.incr('reading_count'); }
      catch (e) { console.error('counter incr failed (non-fatal):', e.message); }
    }

    return res.status(200).json({ reading });
  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: 'Reading generation failed', detail: err.message });
  }
}
