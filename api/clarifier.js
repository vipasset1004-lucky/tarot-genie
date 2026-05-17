// Clarifier — 기존 리딩 후 추가 질문 + 카드 1장으로 보충 통찰
// 1/3/5장 상품 한정. 베타 동안 무료. (PG 통합 시 +1,000원으로 전환)

import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

const client = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

const hasRedisEnv =
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL        && process.env.KV_REST_API_TOKEN);
const redis = hasRedisEnv ? Redis.fromEnv() : null;

const CLARIFIER_SYSTEM = `당신은 팔자연구소의 「지니」입니다. 이미 한 차례 리딩을 마친 의뢰인이 새 질문을 가져왔고, 카드를 한 장 추가로 뽑았습니다. 이전 리딩의 흐름을 짚으면서, 추가 카드와 새 질문에 집중해 보충 통찰을 제공하세요.

【원칙】
- 어투: "~합니다 / ~입니다" 정중한 카운슬러체
- 이전 리딩과의 연결을 1문장 짚고 시작 (반복 X, 보충 O)
- 추가 카드의 점성술·원소·키워드와 추가 질문을 결합해 해석
- 의뢰인 별자리(생년월일 기반) × 추가 카드 매핑의 호응 1줄 포함
- 길이보다 깊이 — 한 문장에 통찰 한 개씩 단단하게
- 마지막 한 줄에 실천 한 가지 (P.L.A.N 형식 X, 단문)

【출력】
반드시 아래 JSON만 출력. \`\`\`json 코드블록 금지. { 로 시작 } 로 끝.

{
  "section": {
    "title": "📌 보충 통찰 — [추가카드명] ([정/역])",
    "paragraphs": [
      "이전 리딩과의 연결 1문장",
      "추가 카드 기운 + 별자리 호응 1~2문장",
      "추가 질문에 대한 핵심 통찰 2~3문장 (비유 활용, 일상 언어)",
      "○○님이 오늘부터 실천할 한 가지"
    ]
  }
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { originalContext, additionalQuestion, additionalCard } = req.body || {};
  if (!originalContext || !additionalQuestion || !additionalCard) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!additionalQuestion.trim()) {
    return res.status(400).json({ error: 'Empty additional question' });
  }

  const { product, userName, userBirth, userGender, userQuestion, selectedCards } = originalContext;
  const direction = additionalCard.isReversed ? '역방향' : '정방향';
  const meaning   = additionalCard.isReversed ? additionalCard.reversed : additionalCard.upright;

  const originalCardsBrief = (selectedCards || []).map((c, i) =>
    `${i+1}. ${c.name}(${c.isReversed ? '역' : '정'})`
  ).join(', ');

  const userMessage = `【의뢰인】 ${userName || '익명'} · ${userBirth || '생년월일 미입력'} · ${userGender || ''}
【이전 리딩】 ${product?.name || '타로 리딩'} (${originalCardsBrief})
【이전 질문】 ${userQuestion}

【새 질문】 ${additionalQuestion}

【추가로 뽑은 카드】
${additionalCard.name}(${additionalCard.nameEn}) [${direction}]
핵심 키워드: ${meaning}

위 추가 카드와 새 질문에 집중해 보충 통찰 1섹션을 출력하세요.`;

  try {
    const completion = await client.chat.completions.create({
      model: '~anthropic/claude-sonnet-latest',
      max_tokens: 900,
      messages: [
        { role: 'system', content: CLARIFIER_SYSTEM },
        { role: 'user',   content: userMessage }
      ]
    });

    let text = completion.choices[0].message.content || '';
    let section;
    try {
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) text = fenceMatch[1];
      const startIdx = text.indexOf('{');
      if (startIdx > 0) text = text.slice(startIdx);
      const parsed = JSON.parse(text.trim());
      section = parsed.section || parsed;
      if (!section || !section.title || !Array.isArray(section.paragraphs)) {
        throw new Error('Invalid section shape');
      }
    } catch (e) {
      console.error('Clarifier JSON parse failed:', e.message, '| text:', text.slice(0, 300));
      section = {
        title: `📌 보충 통찰 — ${additionalCard.name}`,
        paragraphs: [text || '응답을 해석하지 못했습니다.']
      };
    }

    // 보충도 카운터에 +1 (실제 리딩이 한 번 더 일어난 셈)
    if (redis) {
      try { await redis.incr('reading_count'); }
      catch (e) { console.error('clarifier counter incr failed:', e.message); }
    }

    return res.status(200).json({ section });
  } catch (err) {
    console.error('Clarifier API error:', err);
    return res.status(500).json({ error: 'Clarifier failed', detail: err.message });
  }
}
