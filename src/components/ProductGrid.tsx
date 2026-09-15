import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMediaUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, MapPin, Clock, Loader2, Package, PlusCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["All Items", "Electronics", "Fashion", "Books", "Crafts", "Sports", "Appliances", "Other"];

const ProductGrid = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["home-published-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(
          `
          *,
          profiles!items_owner_id_fkey (
            full_name,
            city,
            avatar_url
          ),
          item_media (
            id,
            storage_path,
            media_type,
            angle_index
          )
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(9);

      if (error) throw error;
      return data || [];
    },
  });

  const filteredItems = items.filter((item: any) => {
    if (selectedCategory === "All Items") return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const toggleSave = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-2">Available for Swap</h2>
            <p className="text-muted-foreground">Discover verified items from community members nearby</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={category === selectedCategory ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {isError ? (
          <Card className="border-destructive/30 bg-destructive/5 my-6">
            <CardContent className="py-12 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-1">
                  Failed to Load Items
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error ? error.message : "Could not fetch available items from the database."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Retry Query
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-1">No items listed yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Be the first in your area to share an item with the EcoSwapSquare community.
                </p>
              </div>
              <Link to="/list-item">
                <Button variant="eco" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  List an Item
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((product: any) => {
              const firstMedia = product.item_media?.[0];
              const imageUrl = getMediaUrl(firstMedia?.storage_path);
              const isSaved = !!savedItems[product.id];
              const owner = product.profiles;

              return (
                <Card
                  key={product.id}
                  className="group hover:shadow-lg transition-all duration-300 border-border cursor-pointer overflow-hidden flex flex-col"
                  onClick={() => navigate(`/item/${product.id}`)}
                >
                  <CardContent className="p-0 flex-1 flex flex-col">
                    <div className="relative">
                      <div className="w-full h-48 bg-muted overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => toggleSave(product.id, e)}
                        className={`absolute top-2 right-2 bg-black/40 hover:bg-black/60 rounded-full ${
                          isSaved ? "text-red-500" : "text-white"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                      </Button>
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                        {product.condition}
                      </Badge>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                        {product.price_value && (
                          <span className="text-xs font-semibold text-primary">
                            ~${product.price_value}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground space-x-4 mt-auto">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">
                            {product.city || owner?.city || "Local"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(product.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      variant="swap"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/item/${product.id}`);
                      }}
                    >
                      Propose Swap
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/browse">
            <Button variant="outline" size="lg">
              Explore All Items
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;