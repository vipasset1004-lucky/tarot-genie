import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SPREAD_POSITIONS = {
  daily:         ['오늘의 메시지'],
  three:         ['과거', '현재', '미래'],
  yearly:        ['상반기', '하반기', '전반적 흐름'],
  comprehensive: ['연애/감정', '직업/목표', '재물/금전', '건강/에너지', '종합 조언'],
  celtic:        ['현재 상황', '도전/장애물', '잠재의식', '과거', '가능한 미래', '단기 미래', '나의 태도', '외부 영향', '희망/두려움', '최종 결과'],
  saju:          ['본질적 에너지', '현재 운세', '사주 보완', '관계의 흐름', '재물의 흐름', '건강/활력', '올해 방향', '내년 준비', '장기 비전', '핵심 조언']
};

const PRODUCT_DESCRIPTIONS = {
  daily:         '오늘 하루의 기운과 메시지를 담은 1장 리딩',
  three:         '과거·현재·미래 흐름을 보는 3카드 스프레드',
  yearly:        '2026년 한 해의 운세 흐름을 분석하는 세운 리딩',
  comprehensive: '연애·직업·재물·건강을 종합적으로 분석하는 5카드 리딩',
  celtic:        '삶의 전반적인 상황을 깊이 분석하는 켈틱크로스 10카드 리딩',
  saju:          '사주의 기운과 타로를 결합한 심층 통합 분석 리딩'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { product, selectedCards, userName, userBirth, userGender, userQuestion } = req.body;

  if (!selectedCards?.length || !userQuestion) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const positions = SPREAD_POSITIONS[product.product] || selectedCards.map((_, i) => `카드 ${i+1}`);
  const cardList  = selectedCards.map((card, i) =>
    `${positions[i]}: ${card.name}(${card.nameEn}) - ${card.reversed ? '역방향 — ' + card.reversed : '정방향 — ' + card.upright}`
  ).join('\n');

  const prompt = `당신은 20년 경력의 타로 마스터입니다. 한국어로 깊이 있고 따뜻하며 실질적인 타로 리딩을 제공합니다.

【의뢰인 정보】
- 이름: ${userName}
- 생년월일: ${userBirth}
- 성별: ${userGender || '미입력'}
- 고민/질문: ${userQuestion}

【리딩 종류】
${PRODUCT_DESCRIPTIONS[product.product] || product.name}

【뽑힌 카드】
${cardList}

【리딩 지침】
1. 각 카드 위치의 의미와 카드의 에너지를 결합하여 해석하세요
2. 의뢰인의 구체적인 질문과 상황에 맞게 개인화된 메시지를 전하세요
3. 단순한 카드 의미 나열이 아닌, 스토리처럼 흐르는 리딩을 제공하세요
4. 긍정적이든 도전적이든 솔직하게, 그러나 희망과 방향성을 담아 전달하세요
5. 마지막에 실질적인 행동 조언을 포함하세요

다음 JSON 형식으로 응답해주세요:
{
  "sections": [
    {
      "title": "섹션 제목 (이모지 포함)",
      "paragraphs": ["단락1", "단락2", ...]
    }
  ]
}

${selectedCards.length === 1 ? '전체 리딩을 2~3개 섹션으로 구성하세요.' : `${selectedCards.length}장의 카드 각각에 대한 섹션과 종합 조언 섹션을 포함하세요.`}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    let reading;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      reading = parsed.sections || parsed;
    } catch {
      reading = text;
    }

    return res.status(200).json({ reading });
  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: 'Reading generation failed' });
  }
}
