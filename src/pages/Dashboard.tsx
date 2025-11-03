import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, LogOut, Sparkles, TrendingUp, ShoppingBag, Crown, Package, Trash2 } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: string;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  base_price: number | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      setIsAdmin(hasAdminRole || false);

      // Load user's ads
      const { data: adsData, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(adsData || []);

      // Load user's products
      const { data: productsData } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar seus dados");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Produto excluído com sucesso!");
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Meu Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus anúncios e configurações
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin-dashboard")}
                variant="outline"
                className="border-accent/50"
              >
                <Crown className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ads.length}</p>
                  <p className="text-sm text-muted-foreground">Anúncios Criados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">∞</p>
                  <p className="text-sm text-muted-foreground">Gerações Ilimitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">IA</p>
                  <p className="text-sm text-muted-foreground">Tecnologia Avançada</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Meus Produtos ({products.length})
                </CardTitle>
                <CardDescription>Produtos criados com IA</CardDescription>
              </div>
              <Button
                onClick={() => navigate("/create")}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Produto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não criou nenhum produto
                </p>
                <Button
                  onClick={() => navigate("/create")}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Produto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id} className="border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-lg">{product.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {product.category && (
                              <Badge variant="secondary">{product.category}</Badge>
                            )}
                            {product.tags?.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {new Date(product.created_at).toLocaleDateString("pt-BR")}
                            </span>
                            {product.base_price && (
                              <span className="font-semibold text-primary">
                                R$ {product.base_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Seus Anúncios</CardTitle>
                <CardDescription>Anúncios criados anteriormente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : ads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum anúncio criado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ads.map((ad) => (
                  <Card key={ad.id} className="border-border/50 bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{ad.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {ad.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ad.keywords?.map((keyword: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge
                          variant={ad.status === "published" ? "default" : "secondary"}
                        >
                          {ad.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
