import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const [productName, setProductName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }
    setIsLoading(true);
    toast.success("Funcionalidade em desenvolvimento");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Criar Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nome do produto"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <Button onClick={handleGenerate} disabled={isLoading} className="bg-gradient-primary">
              <Sparkles className="mr-2 h-4 w-4" />
              {isLoading ? "Gerando..." : "Gerar com IA"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Create;
