import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Leaf, 
  DollarSign, 
  Droplets, 
  Trees, 
  Sparkles, 
  PlusCircle, 
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

const ImpactCalculator = () => {
  const [itemCount, setItemCount] = useState<number>(4);

  // Calculations per swapped item average:
  // Avg market value preserved: $85
  // Avg CO2 saved: 14.5 kg
  // Avg water saved: 650 liters (apparel + tech production)
  // Trees equivalent: ~0.65 trees per item (annual absorption)

  const moneySaved = itemCount * 85;
  const carbonSaved = (itemCount * 14.5).toFixed(1);
  const waterSaved = (itemCount * 650).toLocaleString();
  const treesEquivalent = (itemCount * 0.65).toFixed(1);

  return (
    <section className="py-20 bg-muted/40 relative overflow-hidden border-y border-border">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3.5 py-1 text-xs">
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            Interactive Circular Calculator
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Calculate Your Personal Eco & Financial Impact
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            How many unused items are sitting in your closets, shelves, or drawers? See what happens when you trade them instead of buying new.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-card border border-border shadow-xl p-6 sm:p-10">
          
          {/* Slider Controls */}
          <div className="mb-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="items-slider" className="text-base font-semibold text-foreground">
                Number of unused items you could swap:
              </label>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-primary">
                  {itemCount}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {itemCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              id="items-slider"
              type="range"
              min="1"
              max="20"
              value={itemCount}
              onChange={(e) => setItemCount(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />

            {/* Quick selector buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground mr-1">Quick Select:</span>
              {[2, 4, 8, 12, 16].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setItemCount(num)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    itemCount === num
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {num} items
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            {/* Money Saved */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 text-center flex flex-col justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                ${moneySaved}
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-1">
                Money Saved (Est.)
              </div>
            </div>

            {/* Carbon Offset */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 text-center flex flex-col justify-center">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-2.5">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {carbonSaved} kg
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-1">
                CO₂ Emissions Prevented
              </div>
            </div>

            {/* Water Saved */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 text-center flex flex-col justify-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2.5">
                <Droplets className="h-5 w-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {waterSaved} L
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-1">
                Fresh Water Preserved
              </div>
            </div>

            {/* Trees equivalent */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/20 text-center flex flex-col justify-center">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2.5">
                <Trees className="h-5 w-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {treesEquivalent}
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-1">
                Tree Absorption Equiv.
              </div>
            </div>

          </div>

          {/* CTA Banner inside calculator */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-success/10 to-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start font-bold text-foreground text-sm sm:text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Turn unused items into community value today
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Listing takes only 60 seconds with our photo guidance.
              </p>
            </div>
            
            <Link to="/list-item" className="shrink-0">
              <Button variant="eco" size="lg" className="gap-2 font-semibold shadow-md">
                <PlusCircle className="h-4 w-4" />
                List Your First Item Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ImpactCalculator;
