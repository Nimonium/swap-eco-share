import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary to-success text-primary-foreground py-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-background"></div>
        <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-background"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 rounded-full bg-background"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-background"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2 text-sm">
              <Recycle className="h-4 w-4" />
              <span>Sustainable Community Exchange</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Swap Products,
              <br />
              <span className="text-white/90">Save Resources</span>
            </h1>
            
            <p className="text-xl text-white/80 leading-relaxed max-w-lg">
              Join our sustainable community to exchange items you no longer need for things 
              you need. Reduce waste and save money.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" className="group">
                Start Swapping
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                How It Works
              </Button>
            </div>
          </div>

          {/* Right Content - Floating Cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4 transform rotate-3">
              <div className="bg-white/90 rounded-lg p-4 shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="w-full h-24 bg-muted rounded mb-2"></div>
                <p className="text-sm font-medium text-foreground">Vintage Camera</p>
                <p className="text-xs text-muted-foreground">Electronics</p>
              </div>
              <div className="bg-white/90 rounded-lg p-4 shadow-lg transform rotate-12 hover:rotate-6 transition-transform duration-300 mt-8">
                <div className="w-full h-24 bg-muted rounded mb-2"></div>
                <p className="text-sm font-medium text-foreground">Designer Bag</p>
                <p className="text-xs text-muted-foreground">Fashion</p>
              </div>
              <div className="bg-white/90 rounded-lg p-4 shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-300 -mt-4">
                <div className="w-full h-24 bg-muted rounded mb-2"></div>
                <p className="text-sm font-medium text-foreground">Art Supplies</p>
                <p className="text-xs text-muted-foreground">Crafts</p>
              </div>
              <div className="bg-white/90 rounded-lg p-4 shadow-lg transform -rotate-12 hover:-rotate-6 transition-transform duration-300">
                <div className="w-full h-24 bg-muted rounded mb-2"></div>
                <p className="text-sm font-medium text-foreground">Board Games</p>
                <p className="text-xs text-muted-foreground">Games</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;