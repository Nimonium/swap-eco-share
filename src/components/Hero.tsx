import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Recycle, 
  Sparkles, 
  Play, 
  Search, 
  ArrowLeftRight, 
  Leaf, 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface DemoSwapPair {
  id: string;
  itemA: {
    title: string;
    category: string;
    image: string;
    condition: string;
  };
  itemB: {
    title: string;
    category: string;
    image: string;
    condition: string;
  };
}

const DEMO_PAIRS: DemoSwapPair[] = [
  {
    id: "pair-1",
    itemA: {
      title: "Mirrorless Camera Body",
      category: "Electronics",
      image: "/showcase/vintage_camera.jpg",
      condition: "Like New",
    },
    itemB: {
      title: "Sustainable Canvas Sneakers",
      category: "Fashion",
      image: "/showcase/eco_sneakers.jpg",
      condition: "Pristine",
    },
  },
  {
    id: "pair-2",
    itemA: {
      title: "Studio Wireless Headphones",
      category: "Audio",
      image: "/showcase/premium_headphones.jpg",
      condition: "Mint in Box",
    },
    itemB: {
      title: "Acoustic Folk Guitar",
      category: "Instruments",
      image: "/showcase/acoustic_guitar.jpg",
      condition: "Excellent",
    },
  },
];

const Hero = () => {
  const navigate = useNavigate();
  const [activePairIndex, setActivePairIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwappingAnim, setIsSwappingAnim] = useState(false);

  const activePair = DEMO_PAIRS[activePairIndex];

  const handleNextDemo = () => {
    setIsSwappingAnim(true);
    setTimeout(() => {
      setActivePairIndex((prev) => (prev + 1) % DEMO_PAIRS.length);
      setIsSwappingAnim(false);
    }, 250);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/browse");
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-emerald-950 via-slate-900 to-background text-white pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden border-b border-emerald-900/30">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Decorative Grid lines overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-8 text-left">
            {/* Top pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-medium backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <Recycle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Next-Gen Circular Exchange • 100% Cash-Free</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Swap What You Have. <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
                  Get What You Need.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                Connect with verified swappers in your community. Exchange electronics, fashion, instruments, and gear without spending money — saving wallets and slashing carbon waste.
              </p>
            </div>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl">
              <div className="relative flex items-center shadow-2xl rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl p-1.5 focus-within:border-emerald-400/80 transition-all">
                <Search className="h-5 w-5 text-slate-400 ml-3" />
                <input
                  type="text"
                  placeholder="Search cameras, audio gear, sneakers, bikes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 rounded-xl transition-all shadow-md shrink-0"
                >
                  Search
                </Button>
              </div>

              {/* Popular Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
                <span className="text-slate-500">Popular:</span>
                {[
                  { label: "Vintage Cameras", cat: "Electronics" },
                  { label: "Studio Audio", cat: "Electronics" },
                  { label: "Sneakers", cat: "Fashion" },
                  { label: "Guitars", cat: "Crafts" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(`/browse?category=${encodeURIComponent(item.cat)}`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/50 text-slate-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/browse">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 h-12 rounded-xl group shadow-lg shadow-emerald-500/20">
                  Explore Active Swaps
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("video-showcase")}
                className="border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800 text-white font-medium px-6 h-12 rounded-xl backdrop-blur-sm gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                </div>
                Watch Video Tour
              </Button>
            </div>

          </div>

          {/* Right Hero - Interactive Swap Workflow Visualizer */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md">

              {/* Main Interactive Showcase Card */}
              <div className="rounded-3xl p-5 bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 border border-slate-700/70 shadow-2xl backdrop-blur-2xl">
                
                {/* Header bar of Card */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Direct 1:1 Swap Workflow</span>
                  </div>
                  <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800/40 text-[10px] font-normal">
                    Illustrative example
                  </Badge>
                </div>

                {/* Items Pair Comparison */}
                <div className={`space-y-3 my-4 transition-all duration-300 ${isSwappingAnim ? "opacity-30 scale-98" : "opacity-100 scale-100"}`}>
                  
                  {/* Item A */}
                  <div className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/40 transition-all">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                      <img 
                        src={activePair.itemA.image} 
                        alt={activePair.itemA.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/75 px-1.5 py-0.5 rounded font-medium text-emerald-300">
                        {activePair.itemA.condition}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                        Your item
                      </div>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                        {activePair.itemA.title}
                      </h4>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Offered for trade
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 text-right">
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                        {activePair.itemA.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Circular Swap Bridge Indicator */}
                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-700"></div>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-md">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Fair 1:1 Exchange</span>
                    </div>
                  </div>

                  {/* Item B */}
                  <div className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/40 transition-all">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                      <img 
                        src={activePair.itemB.image} 
                        alt={activePair.itemB.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/75 px-1.5 py-0.5 rounded font-medium text-teal-300">
                        {activePair.itemB.condition}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-teal-400 font-semibold uppercase tracking-wider">
                        Their item
                      </div>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                        {activePair.itemB.title}
                      </h4>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Received in exchange
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 text-right">
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                        {activePair.itemB.category}
                      </Badge>
                    </div>
                  </div>

                </div>

                {/* Swap Metrics Footer */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Leaf className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Circular Exchange:</span>
                  </div>
                  <span className="text-slate-300">Zero cash • Direct community trade</span>
                </div>

                {/* Cycle Demo button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleNextDemo}
                    className="w-full text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 h-9 rounded-xl gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>View Another Example ({activePairIndex + 1}/{DEMO_PAIRS.length})</span>
                  </Button>
                  
                  <Link to="/browse" className="shrink-0">
                    <Button 
                      size="sm" 
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-9 px-3 rounded-xl"
                    >
                      Browse
                    </Button>
                  </Link>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;