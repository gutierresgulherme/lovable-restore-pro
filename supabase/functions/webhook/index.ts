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

      if (mp.status && mp.status !== "cancelled") {
        const value = mp.transaction_amount || 0;
        const email = mp.payer?.email || mp.additional_info?.payer?.email || null;

        const visitor_id =
          mp.metadata?.visitor_id ||
          mp.additional_info?.items?.[0]?.id ||
          null;

        const utm_source = mp.metadata?.utm_source || null;
        const utm_medium = mp.metadata?.utm_medium || null;
        const utm_campaign = mp.metadata?.utm_campaign || null;

        const payload = {
          event: "purchase",
          value,
          currency: "BRL",
          transaction_id: String(mp.id),
          product: "Scale Turbo Pro",
          customer_email: email,
          status: mp.status,
          visitor_id,
          utm_source,
          utm_medium,
          utm_campaign,
          notify_app: true,
        };

        console.log("🚀 Enviando para UTMify:", payload);

        const UTMIFY_KEY = Deno.env.get("UTMIFY_API_KEY");
        if (!UTMIFY_KEY) {
          console.error("❌ UTMIFY_API_KEY ausente");
        } else {
          const utmRes = await fetch("https://api.utmify.com.br/v1/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${UTMIFY_KEY}`,
            },
            body: JSON.stringify(payload),
          });
          const txt = await utmRes.text();
          console.log("🎯 UTMify response status:", utmRes.status);
          console.log("🎯 UTMify response body:", txt);
          
          if (utmRes.ok && mp.status === "approved") {
            console.log("✅ Venda registrada com sucesso");
          }
        }
      } else {
        console.log("⏸️ Pagamento cancelado ou inválido. Status:", mp.status);
      }

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
