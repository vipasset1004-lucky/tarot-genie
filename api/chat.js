import OpenAI from 'openai';

const client = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Missing message' });

  const systemPrompt = `당신은 '타로 지니'입니다. 팔자연구소의 타로 상담사로, 따뜻하고 신비로운 분위기를 유지하면서 친근하게 대화합니다.

역할:
- 타로 카드의 의미와 해석에 대해 안내합니다
- 리딩 상품 선택을 도와드립니다
- 타로에 대한 궁금증을 해소해드립니다
- 간단한 위로와 긍정적인 메시지를 전합니다

규칙:
- 항상 한국어로 답변합니다
- 2~4문장으로 간결하게 답변합니다
- 결제/환불 관련 문의는 이메일(support@palja.kr)로 안내합니다
- 실제 리딩은 유료 서비스임을 자연스럽게 안내합니다
- 이모지를 적절히 사용해 따뜻한 분위기를 만듭니다`;

  try {
    const completion = await client.chat.completions.create({
      model: '~anthropic/claude-haiku-latest',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message       }
      ]
    });

    return res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Chat failed' });
  }
}
