import { useState } from "react";
import { Upload, Search, RefreshCw, ShieldCheck, QrCode, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STEPS = [
  {
    step: "01",
    icon: Upload,
    title: "Snap & List in 60s",
    tag: "Fast Listing",
    description: "Take quick photos of items you no longer use. Add estimated trade value, condition, and what you're hoping to receive.",
    highlight: "AI Category & Value Assistant automatically suggests fair trade matches.",
    preview: {
      badge: "Step 1: Listing",
      image: "/showcase/vintage_camera.jpg",
      subtext: "Camera uploaded with 3 clear angles • Condition: Like New",
    }
  },
  {
    step: "02",
    icon: Search,
    title: "Match & Propose Swap",
    tag: "Direct Trading",
    description: "Explore items near you or filter by specific wishlists. Send a direct 1:1 swap offer with a single tap.",
    highlight: "Both swappers review the proposal with clear mutual value balance.",
    preview: {
      badge: "Step 2: Proposing",
      image: "/showcase/eco_sneakers.jpg",
      subtext: "Offer sent: 'Exchange Veja Sneakers for Camera Lens'",
    }
  },
  {
    step: "03",
    icon: RefreshCw,
    title: "Safe Handover & Badges",
    tag: "Verified Trade",
    description: "Meet up at a local verified community hub or arrange doorstep pickup. Inspect items, confirm the swap, and leave ratings.",
    highlight: "Earn EcoKarma points & track your cumulative carbon diversion.",
    preview: {
      badge: "Step 3: Handover",
      image: "/showcase/community_swapping.jpg",
      subtext: "Exchange completed at Central Square • ★★★★★ rating unlocked",
    }
  }
];

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30 scroll-mt-16 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3.5 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Zero-Waste Circular Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            How EcoSwapSquare Works
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Three simple, transparent steps to trade items you no longer use for things you love. No cash required.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-14">
          {STEPS.map((stepItem, index) => {
            const isCurrent = activeTab === index;
            const Icon = stepItem.icon;

            return (
              <div
                key={stepItem.step}
                onClick={() => setActiveTab(index)}
                className={`relative rounded-3xl p-7 transition-all duration-300 cursor-pointer flex flex-col border ${
                  isCurrent
                    ? "bg-card border-primary shadow-xl ring-2 ring-primary/20"
                    : "bg-card/70 border-border/80 hover:border-border hover:bg-card shadow-sm"
                }`}
              >
                {/* Step badge and icon */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    isCurrent 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "bg-muted text-foreground"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-black text-muted-foreground/40">
                    {stepItem.step}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2.5 flex-1">
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider mb-1">
                    {stepItem.tag}
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    {stepItem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stepItem.description}
                  </p>
                </div>

                {/* Highlight Pill */}
                <div className="mt-6 pt-4 border-t border-border/60 text-xs text-primary font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{stepItem.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Visual Preview Box */}
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden bg-card border border-border shadow-xl p-6 sm:p-8">
          <div className="grid sm:grid-cols-12 gap-6 items-center">
            
            <div className="sm:col-span-5 relative rounded-2xl overflow-hidden aspect-[4/3] bg-muted shadow-md border border-border">
              <img
                src={STEPS[activeTab].preview.image}
                alt={STEPS[activeTab].title}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-3 left-3 bg-black/75 text-white backdrop-blur-md border-0 text-xs">
                {STEPS[activeTab].preview.badge}
              </Badge>
            </div>

            <div className="sm:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Step Preview</span>
              </div>
              <h4 className="text-2xl font-extrabold text-foreground">
                {STEPS[activeTab].title}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {STEPS[activeTab].preview.subtext}
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link to="/list-item">
                  <Button variant="eco" size="sm" className="gap-2">
                    Try It Yourself
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/browse">
                  <Button variant="outline" size="sm">
                    Browse Community Items
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;