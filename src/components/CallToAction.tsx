import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary to-success text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-32 right-32 w-24 h-24 rounded-full bg-white/20"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/10"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-6 py-3 mb-8">
            <Users className="h-5 w-5" />
            <span className="text-lg">Join thousands of eco-conscious members</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Ready to Start Swapping?
          </h2>
          
          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed max-w-2xl mx-auto">
            Join thousands of eco-conscious members swapping items right now
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="group text-lg px-8 py-6">
                Sign Up Free
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <div className="text-center sm:text-left">
              <p className="text-white/80 text-sm">No credit card required</p>
              <p className="text-white/60 text-xs">Start swapping in under 2 minutes</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">10k+</div>
              <div className="text-white/80 text-sm">Items Swapped</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">5k+</div>
              <div className="text-white/80 text-sm">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">50+</div>
              <div className="text-white/80 text-sm">Cities</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;