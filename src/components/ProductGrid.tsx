import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, MapPin, Clock } from "lucide-react";

const ProductGrid = () => {
  const categories = ["All Items", "Electronics", "Fashion", "Books", "Crafts", "Other"];
  
  const products = [
    {
      id: 1,
      title: "Vintage Record Player",
      category: "Electronics",
      condition: "Good",
      location: "San Francisco",
      timeAgo: "2 hours ago",
      image: "/placeholder.svg",
      saved: false
    },
    {
      id: 2,
      title: "Designer Leather Jacket",
      category: "Fashion",
      condition: "Excellent",
      location: "New York",
      timeAgo: "5 hours ago",
      image: "/placeholder.svg",
      saved: true
    },
    {
      id: 3,
      title: "Photography Books Collection",
      category: "Books",
      condition: "Very Good",
      location: "Los Angeles",
      timeAgo: "1 day ago",
      image: "/placeholder.svg",
      saved: false
    },
    {
      id: 4,
      title: "Pottery Wheel Set",
      category: "Crafts",
      condition: "Fair",
      location: "Chicago",
      timeAgo: "2 days ago",
      image: "/placeholder.svg",
      saved: false
    },
    {
      id: 5,
      title: "Mountain Bike",
      category: "Sports",
      condition: "Good",
      location: "Seattle",
      timeAgo: "3 days ago",
      image: "/placeholder.svg",
      saved: true
    },
    {
      id: 6,
      title: "Coffee Maker",
      category: "Appliances",
      condition: "Excellent",
      location: "Austin",
      timeAgo: "4 days ago",
      image: "/placeholder.svg",
      saved: false
    }
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-4">Available for Swap</h2>
            <p className="text-muted-foreground">Discover amazing items from our community</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All Items" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 rounded-t-lg"></div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`absolute top-2 right-2 ${product.saved ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
                  >
                    <Heart className={`h-4 w-4 ${product.saved ? 'fill-current' : ''}`} />
                  </Button>
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                    {product.condition}
                  </Badge>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  <Badge variant="secondary" className="mb-3">
                    {product.category}
                  </Badge>
                  
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{product.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{product.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0">
                <Button variant="swap" className="w-full">
                  Propose Swap
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Items
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;