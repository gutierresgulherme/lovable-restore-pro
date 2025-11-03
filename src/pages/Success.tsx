import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

// Helper: Aguardar UTMify carregar
function waitForUtmify(maxMs = 4000): Promise<any> {
  return new Promise(resolve => {
    const start = Date.now();
    const iv = setInterval(() => {
      if ((window as any).utmify?.track) {
        clearInterval(iv);
        resolve((window as any).utmify);
      }
      if (Date.now() - start > maxMs) {
        clearInterval(iv);
        resolve(null);
      }
    }, 100);
  });
}

// Helper: Enviar evento purchase com retry exponencial
async function safeTrackPurchase(payload: any) {
  console.log("🎯 Iniciando envio de evento purchase para UTMify...");
  const utm = await waitForUtmify(5000);

  const attempt = async () => {
    try {
      if (!utm?.track) throw new Error("utmify.track indisponível");
      utm.track("purchase", payload);
      console.log("✅ UTMify track purchase enviado:", payload);
      return true;
    } catch (e) {
      console.warn("⚠️ UTMify track falhou, tentando fallback...", e);
      return false;
    }
  };

  // 1ª tentativa
  if (await attempt()) return;

  // Retries: 3 tentativas com backoff 800ms, 1600ms, 3200ms
  for (const ms of [800, 1600, 3200]) {
    await new Promise(r => setTimeout(r, ms));
    if (await attempt()) return;
  }

  console.error("❌ Não foi possível enviar evento purchase para UTMify após retries.");
}

// Helper: Consultar status do pagamento no Mercado Pago
async function getMpPayment(paymentId: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-payment-status?payment_id=${paymentId}`
    );
    if (!response.ok) throw new Error(`MP status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("❌ Erro ao consultar pagamento MP:", error);
    return null;
  }
}

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      const paymentId = searchParams.get("payment_id");
      const status = searchParams.get("status");

      console.log("📩 Success page - payment_id:", paymentId, "status:", status);

      if (!paymentId) {
        setError("ID de pagamento não encontrado");
        setLoading(false);
        return;
      }

      // Consultar detalhes do pagamento
      const paymentData = await getMpPayment(paymentId);
      
      if (!paymentData) {
        setError("Não foi possível verificar o status do pagamento");
        setLoading(false);
        return;
      }

      setPayment(paymentData);

      // Se já está aprovado, enviar evento imediatamente
      if (paymentData.status === "approved") {
        await sendPurchaseEvent(paymentData);
        setLoading(false);
        return;
      }

      // Se está pendente, fazer polling até 30s
      if (paymentData.status === "pending" || paymentData.status === "in_process") {
        console.log("⏳ Pagamento pendente, iniciando polling...");
        let attempts = 0;
        const maxAttempts = 7; // 7 tentativas x 4s = ~28s

        const pollInterval = setInterval(async () => {
          attempts++;
          console.log(`🔄 Polling tentativa ${attempts}/${maxAttempts}`);

          const updatedPayment = await getMpPayment(paymentId);
          
          if (updatedPayment?.status === "approved") {
            clearInterval(pollInterval);
            setPayment(updatedPayment);
            await sendPurchaseEvent(updatedPayment);
            setLoading(false);
            console.log("✅ Pagamento aprovado durante polling!");
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setLoading(false);
            console.log("⏱️ Polling timeout - pagamento ainda pendente");
          }
        }, 4000);

        return () => clearInterval(pollInterval);
      }

      setLoading(false);
    };

    const sendPurchaseEvent = async (paymentData: any) => {
      // Coletar dados do UTMify
      const utmify = (window as any).utmify;
      const visitorId = utmify?.getVisitorId?.() ?? null;
      const utms = utmify?.getUtm?.() ?? {};

      const payload = {
        event: "purchase",
        value: Number(paymentData.transaction_amount || 0),
        currency: "BRL",
        transaction_id: String(paymentData.id),
        product: "Scale Turbo Pro",
        customer_email: paymentData.payer?.email ?? null,
        status: paymentData.status,
        visitor_id: visitorId,
        utm_source: utms.source ?? null,
        utm_medium: utms.medium ?? null,
        utm_campaign: utms.campaign ?? null,
        utm_term: utms.term ?? null,
        utm_content: utms.content ?? null,
        notify_app: true,
      };

      console.log("🚀 Enviando evento purchase:", payload);
      await safeTrackPurchase(payload);
    };

    processPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Processando pagamento...
            </CardTitle>
            <CardDescription>
              Aguarde enquanto confirmamos seu pagamento
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Seu pagamento foi processado com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payment && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID da Transação:</span>
                <span className="font-mono">{payment.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-semibold">
                  R$ {Number(payment.transaction_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {payment.status === "approved" ? "Aprovado" : payment.status}
                </span>
              </div>
            </div>
          )}
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
