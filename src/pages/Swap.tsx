import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Clock, CheckCircle, XCircle, Package, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Swap = () => {
  const [activeTab, setActiveTab] = useState("active");

  const swapRequests = [
    {
      id: 1,
      status: "pending",
      requester: {
        name: "Sarah Chen",
        avatar: "/placeholder.svg",
        location: "San Francisco"
      },
      myItem: {
        title: "Vintage Camera",
        image: "/placeholder.svg"
      },
      theirItem: {
        title: "Professional Microphone",
        image: "/placeholder.svg"
      },
      message: "Hi! I love your vintage camera. I'm a podcaster and have this professional microphone that I think would be a fair trade. Let me know what you think!",
      timeAgo: "2 hours ago"
    },
    {
      id: 2,
      status: "accepted",
      requester: {
        name: "Mike Johnson",
        avatar: "/placeholder.svg",
        location: "Los Angeles"
      },
      myItem: {
        title: "Guitar Amplifier",
        image: "/placeholder.svg"
      },
      theirItem: {
        title: "Digital Piano",
        image: "/placeholder.svg"
      },
      message: "Perfect! The piano is exactly what I need for my home studio.",
      timeAgo: "1 day ago"
    },
    {
      id: 3,
      status: "completed",
      requester: {
        name: "Emma Wilson",
        avatar: "/placeholder.svg",
        location: "New York"
      },
      myItem: {
        title: "Art Supplies Set",
        image: "/placeholder.svg"
      },
      theirItem: {
        title: "Photography Books",
        image: "/placeholder.svg"
      },
      message: "Thank you for the amazing art supplies! The books are on their way.",
      timeAgo: "1 week ago"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "accepted": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "declined": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "completed": return <Package className="h-4 w-4" />;
      case "declined": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSwaps = swapRequests.filter(swap => {
    if (activeTab === "active") return ["pending", "accepted"].includes(swap.status);
    if (activeTab === "completed") return swap.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">My Swaps</h1>
          <p className="text-muted-foreground">Manage your ongoing and completed swaps</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Swaps</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Swaps</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {filteredSwaps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No swaps found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "active" 
                      ? "You don't have any active swaps right now." 
                      : "You haven't completed any swaps yet."}
                  </p>
                  <Button variant="swap">Start Browsing Items</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSwaps.map((swap) => (
                  <Card key={swap.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={swap.requester.avatar} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{swap.requester.name}</h3>
                            <p className="text-sm text-muted-foreground">{swap.requester.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`${getStatusColor(swap.status)} text-white`}
                          >
                            {getStatusIcon(swap.status)}
                            <span className="ml-1 capitalize">{swap.status}</span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">{swap.timeAgo}</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground">Your Item</h4>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-lg"></div>
                            <div>
                              <h5 className="font-medium">{swap.myItem.title}</h5>
                              <p className="text-sm text-muted-foreground">Your item</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground">Their Item</h4>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-success/20 rounded-lg"></div>
                            <div>
                              <h5 className="font-medium">{swap.theirItem.title}</h5>
                              <p className="text-sm text-muted-foreground">Their offer</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm">{swap.message}</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {swap.status === "pending" && (
                          <>
                            <Button variant="swap" size="sm">
                              Accept Swap
                            </Button>
                            <Button variant="outline" size="sm">
                              Decline
                            </Button>
                          </>
                        )}
                        {swap.status === "accepted" && (
                          <Button variant="swap" size="sm">
                            Mark as Completed
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="ml-auto">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Swap;