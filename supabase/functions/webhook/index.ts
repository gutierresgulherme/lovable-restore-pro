// Optimized webhook with background processing
Deno.serve(async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  console.log("📩 Webhook MP recebido:", new Date().toISOString());

  // Read body BEFORE returning response
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (err) {
    console.error("⚠️ Erro ao ler body:", err);
  }

  // Background processing function
  const processWebhook = async () => {
    try {
      const ua = (req.headers.get("user-agent") || "").toLowerCase();
      const origin = (req.headers.get("origin") || req.headers.get("referer") || "").toLowerCase();
      if (!ua.includes("mercadopago") && !origin.includes("mercadopago.com")) {
        console.log("ℹ️ Origem não identificada como Mercado Pago (permitindo para testes). UA:", ua, "Origin:", origin);
      }

      let body = null;
      try {
        body = JSON.parse(bodyText);
      } catch {
        console.log("⚠️ Body não é JSON, tentando converter manualmente...");
        body = Object.fromEntries(new URLSearchParams(bodyText));
      }

      console.log("🧾 Body bruto recebido:", bodyText);
      console.log("📦 Body interpretado:", JSON.stringify(body));

      if (!body || Object.keys(body).length === 0) {
        console.log("⚠️ Body ausente ou vazio");
        return;
      }

      const paymentId =
        body?.data?.id ||
        body?.id ||
        body?.resource?.split("/").pop() ||
        (body?.topic?.includes("payment") ? body?.resource?.split("/").pop() : null);
      
      console.log("💳 paymentId detectado:", paymentId);

      if (!paymentId) {
        console.log("⚠️ paymentId não encontrado no webhook");
        return;
      }

      const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
      if (!MP_TOKEN) {
        console.error("❌ MERCADO_PAGO_ACCESS_TOKEN ausente no ambiente");
        return;
      }

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      });
      const mp = await mpRes.json();
      console.log("💳 MP payment:", mp.id, mp.status);

      // Log do pagamento (removido envio server-side para UTMify)
      // O evento será enviado via client-side na página /success
      console.log("💳 Pagamento processado:", {
        id: mp.id,
        status: mp.status,
        amount: mp.transaction_amount,
        email: mp.payer?.email,
      });
      console.log("ℹ️ Evento será enviado via client-side na página /success");

      const elapsed = Date.now() - startTime;
      console.log(`✅ Processamento completo em ${elapsed}ms`);
    } catch (err) {
      console.error("💥 Erro no processamento background:", err);
    }
  };

  // Start background processing
  // @ts-ignore - EdgeRuntime is available in Deno Deploy
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(processWebhook());
  } else {
    // Fallback for local testing
    processWebhook().catch(console.error);
  }

  const responseTime = Date.now() - startTime;
  console.log(`⚡ Tempo de resposta: ${responseTime}ms`);

  // Immediate response to Mercado Pago
  return new Response("ok", { 
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
});
