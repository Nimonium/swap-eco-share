import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote, ArrowLeftRight, CheckCircle2, Heart, Sparkles } from "lucide-react";

interface StoryCard {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  itemOffered: string;
  itemReceived: string;
  image: string;
  story: string;
  tag: string;
}

const STORIES: StoryCard[] = [
  {
    id: "1",
    name: "Elena Rostova",
    location: "Central District, Munich",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    itemOffered: "Vintage Acoustic Guitar",
    itemReceived: "Studio Audio Deck",
    image: "/showcase/acoustic_guitar.jpg",
    story: "My guitar had been unplayed for years after I switched instruments. Within 48 hours on EcoSwap, I matched with a producer nearby. We did a safe handover in the park square and now we even jam together!",
    tag: "Instruments & Music",
  },
  {
    id: "2",
    name: "Marcus Vance",
    location: "Kreuzberg, Berlin",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    itemOffered: "Vintage Lens Collection",
    itemReceived: "Fujifilm X-T5 Camera",
    image: "/showcase/vintage_camera.jpg",
    story: "Zero cash changed hands. Both of us were stunned at how seamless the swap verification was. The camera is pristine and the previous owner got lenses he was desperately looking for.",
    tag: "Photography & Gear",
  },
  {
    id: "3",
    name: "Sophie Dupont",
    location: "Saint-Germain, Paris",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    itemOffered: "Heritage Canvas Sneakers",
    itemReceived: "Ceramic Planter Set",
    image: "/showcase/eco_sneakers.jpg",
    story: "Bought the wrong size online and couldn't return them. Instead of selling on sketchy classifieds, EcoSwap matched me with Sophie 3 blocks away. Kept quality clothing out of the bin!",
    tag: "Sustainable Fashion",
  },
  {
    id: "4",
    name: "David & Maya Lin",
    location: "Vesterbro, Copenhagen",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    itemOffered: "Studio Noise-Canceling Headphones",
    itemReceived: "Mechanical Keyboard",
    image: "/showcase/premium_headphones.jpg",
    story: "Upgraded my workstation setup without spending a single euro. The condition was verified on meetup, rating updated instantly. This is the future of sustainable living.",
    tag: "Workstation Audio",
  },
];

const CommunityStories = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3.5 py-1 text-xs">
            <Heart className="h-3.5 w-3.5 mr-1.5 fill-current" />
            Real Community Experiences
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Loved by Conscious Swappers Everywhere
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Over 5,000+ members are giving their favorite things a second journey. Here is how they did it.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STORIES.map((story) => (
            <Card 
              key={story.id} 
              className="group overflow-hidden border-border/80 hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col bg-card"
            >
              {/* Photo Showcase */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={story.image}
                  alt={story.itemOffered}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white border-0 text-[10px]">
                  {story.tag}
                </Badge>
              </div>

              {/* Card Body */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Swap Match badge */}
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border/60 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-wider">
                    <span>Traded Item</span>
                    <ArrowLeftRight className="h-3 w-3 text-primary" />
                    <span>Received</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-foreground text-[11px] truncate">
                    <span className="truncate max-w-[100px]">{story.itemOffered}</span>
                    <span className="text-primary font-bold">⇄</span>
                    <span className="truncate max-w-[100px] text-right text-primary">{story.itemReceived}</span>
                  </div>
                </div>

                {/* Testimonial Quote */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic flex-1">
                  "{story.story}"
                </p>

                {/* User Info */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={story.avatar}
                      alt={story.name}
                      className="w-9 h-9 rounded-full object-cover border border-primary/30"
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        {story.name}
                        <CheckCircle2 className="h-3 w-3 text-primary fill-primary/20" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {story.location}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-amber-400">
                    {[...Array(story.rating)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CommunityStories;
