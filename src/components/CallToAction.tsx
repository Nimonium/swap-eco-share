import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Sparkles, ShieldCheck, Leaf, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          {/* Top Pill with Avatar Stack */}
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/15 rounded-full px-5 py-2 backdrop-blur-md shadow-lg">
            <div className="flex -space-x-2 overflow-hidden">
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-emerald-400 object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                alt="Member"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-emerald-400 object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                alt="Member"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-emerald-400 object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                alt="Member"
              />
            </div>
            <span className="text-xs sm:text-sm font-medium text-emerald-200">
              Join 5,800+ conscious members trading daily
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Ready to Clear Clutter & <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
              Find Your Next Favorite Item?
            </span>
          </h2>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Give items sitting in your closet, garage, or desk a second life. Connect directly with people in your neighborhood and start swapping immediately.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/auth">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 h-14 rounded-2xl text-base shadow-xl shadow-emerald-500/25 group">
                Create Free Swapper Account
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link to="/browse">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-white font-semibold px-7 h-14 rounded-2xl text-base backdrop-blur-md"
              >
                Browse Available Goods
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified member IDs
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Leaf className="h-4 w-4 text-emerald-400" />
              Zero monetary fees
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-emerald-400" />
              100% Circular community
            </span>
          </div>

          {/* Platform Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-slate-800/80 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-3xl font-black text-white">12,400+</div>
              <div className="text-xs text-slate-400 mt-1">Total Items Swapped</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-3xl font-black text-white">5,800+</div>
              <div className="text-xs text-slate-400 mt-1">Active Eco Members</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-3xl font-black text-white">50+</div>
              <div className="text-xs text-slate-400 mt-1">Metro Exchange Hubs</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-3xl font-black text-white">28.5 T</div>
              <div className="text-xs text-slate-400 mt-1">CO₂ Diverted from Air</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default CallToAction;