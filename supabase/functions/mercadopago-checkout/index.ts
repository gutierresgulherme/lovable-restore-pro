import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount, origin } = await req.json();
    console.log('📦 Criando preferência MP para:', email, 'Valor:', amount);

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return new Response(
        JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://') || '';
    const projectRef = baseUrl.split('//')[1]?.split('.')[0] || '';
    const appOrigin = origin || 'https://lovableproject.com';

    const preference = {
      items: [
        {
          title: 'Acesso Vitalício - Scale Turbo Shopee',
          quantity: 1,
          unit_price: Number(amount) || 39.00,
          currency_id: 'BRL',
        }
      ],
      payer: {
        email: email,
      },
      back_urls: {
        success: `${appOrigin}/success`,
        failure: `${appOrigin}/auth?payment=failure`,
        pending: `${appOrigin}/success`,
      },
      auto_return: 'approved',
      notification_url: `https://${projectRef}.supabase.co/functions/v1/webhook`,
      external_reference: email,
    };

    console.log('🔗 Enviando para MP:', JSON.stringify(preference, null, 2));

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro MP:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar preferência', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('✅ Preferência criada:', data.id, 'Init point:', data.init_point);

    return new Response(
      JSON.stringify({ init_point: data.init_point, preference_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
