import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Sparkles, Filter, MapPin, Clock, Heart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);

  const products = [
    {
      id: 1,
      title: "Vintage Record Player",
      category: "Electronics",
      condition: "Good",
      location: "San Francisco",
      timeAgo: "2 hours ago",
      image: "/placeholder.svg",
      saved: false,
      wantedItems: ["Vinyl Records", "Speakers", "Audio Equipment"]
    },
    {
      id: 2,
      title: "Designer Leather Jacket",
      category: "Fashion",
      condition: "Excellent",
      location: "New York",
      timeAgo: "5 hours ago",
      image: "/placeholder.svg",
      saved: true,
      wantedItems: ["Designer Shoes", "Handbags", "Watches"]
    },
    {
      id: 3,
      title: "Photography Books Collection",
      category: "Books",
      condition: "Very Good",
      location: "Los Angeles",
      timeAgo: "1 day ago",
      image: "/placeholder.svg",
      saved: false,
      wantedItems: ["Camera Equipment", "Art Books", "Photography Gear"]
    }
  ];

  const handleAiSearch = () => {
    // Simulate AI matching logic
    const matches = products.filter(product => 
      product.wantedItems.some(item => 
        item.toLowerCase().includes(aiQuery.toLowerCase()) ||
        product.title.toLowerCase().includes(aiQuery.toLowerCase())
      )
    );
    setAiResults(matches);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Browse Items</h1>
          <p className="text-muted-foreground">Discover amazing items and find perfect swap matches with AI</p>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="ai-swap" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Swap AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
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
                      
                      <div className="flex items-center text-sm text-muted-foreground space-x-4 mb-3">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{product.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{product.timeAgo}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">Looking for:</p>
                        <div className="flex flex-wrap gap-1">
                          {product.wantedItems.slice(0, 2).map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                          {product.wantedItems.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.wantedItems.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button variant="swap" className="w-full">
                        Propose Swap
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai-swap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Swap AI Assistant
                </CardTitle>
                <p className="text-muted-foreground">
                  Describe what you have or what you're looking for, and our AI will find the best swap matches for you.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., 'I have a guitar and I'm looking for photography equipment' or 'Looking for someone who wants books in exchange for kitchen appliances'"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={handleAiSearch} className="w-full" disabled={!aiQuery.trim()}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Find AI Matches
                </Button>
              </CardContent>
            </Card>

            {aiResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">AI Matched Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResults.map((product) => (
                    <Card key={product.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-success/20 rounded-lg"></div>
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{product.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{product.location}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {product.wantedItems.map((item, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                            <Button size="sm" variant="swap">Contact</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Browse;