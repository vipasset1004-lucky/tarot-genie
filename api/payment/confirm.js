const TOSS_SECRET = process.env.TOSS_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentKey, orderId, amount, readingCtx } = req.body;
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'Missing payment params' });
  }

  // 1. Confirm payment with Toss
  try {
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(TOSS_SECRET + ':').toString('base64'),
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });

    if (!tossRes.ok) {
      const err = await tossRes.json();
      console.error('Toss confirm error:', err);
      return res.status(400).json({ error: err.message || 'Payment confirmation failed' });
    }
  } catch (err) {
    console.error('Toss API error:', err);
    return res.status(500).json({ error: 'Payment service error' });
  }

  // 2. Generate reading via Claude
  let reading;
  try {
    const readingRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readingCtx)
    });
    const data = await readingRes.json();
    reading = data.reading;
  } catch (err) {
    console.error('Reading generation error:', err);
    reading = '리딩 생성 중 오류가 발생했습니다. 고객센터(support@palja.kr)로 문의해주세요.';
  }

  // 3. Send email (optional — add your email provider here)
  if (readingCtx?.userEmail) {
    try {
      await sendResultEmail(readingCtx.userEmail, readingCtx.userName, readingCtx.product.name, reading);
    } catch (err) {
      console.error('Email send error:', err);
    }
  }

  return res.status(200).json({ success: true, reading });
}

async function sendResultEmail(email, name, productName, reading) {
  // TODO: integrate your email provider (Resend, SendGrid, etc.)
  // Example with Resend:
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: '팔자연구소 타로 지니 <noreply@palja.kr>',
  //   to: email,
  //   subject: `[팔자연구소] ${name}님의 ${productName} 결과`,
  //   html: buildEmailHtml(name, productName, reading)
  // });
  console.log(`Email would be sent to ${email}`);
}
