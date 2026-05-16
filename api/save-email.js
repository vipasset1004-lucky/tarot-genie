// 이메일 수집 endpoint
// 현재: Vercel Functions 로그에만 기록
// 향후: Resend 통합 시 자동 발송 + DB 저장

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, userName, product, timestamp } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Vercel 대시보드 → Logs에서 확인 가능
  console.log('[EMAIL_CAPTURE]', JSON.stringify({
    email,
    userName: userName || '',
    product:  product  || '',
    timestamp: timestamp || new Date().toISOString()
  }));

  return res.status(200).json({ ok: true });
}
