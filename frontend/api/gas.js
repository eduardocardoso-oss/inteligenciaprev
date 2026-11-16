/**
 * Proxy seguro entre o navegador e o Google Apps Script.
 *
 * Configure na Vercel:
 *   GAS_WEB_APP_URL
 *   GAS_SHARED_SECRET
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      error: 'Método não permitido.'
    });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const sharedSecret = process.env.GAS_SHARED_SECRET;

  if (!gasUrl || !sharedSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Integração com o backend ainda não foi configurada na Vercel.'
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    const action = String(body.action || '').trim();
    const args = Array.isArray(body.args) ? body.args : [];

    if (!action) {
      return res.status(400).json({
        ok: false,
        error: 'Ação não informada.'
      });
    }

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        secret: sharedSecret,
        action,
        args
      }),
      redirect: 'follow'
    });

    const text = await response.text();

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_err) {
      return res.status(502).json({
        ok: false,
        error: 'O Apps Script retornou uma resposta inválida.'
      });
    }

    if (!payload || payload.ok !== true) {
      return res.status(500).json({
        ok: false,
        error:
          payload && payload.error
            ? payload.error
            : 'Falha no backend do Apps Script.'
      });
    }

    return res.status(200).json({
      ok: true,
      result: payload.result
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error:
        err && err.message
          ? err.message
          : 'Erro inesperado na integração.'
    });
  }
};
