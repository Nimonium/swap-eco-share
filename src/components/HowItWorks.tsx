import { Upload, Search, RefreshCw } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "List Your Items",
      description: "Upload photos of items you want to exchange. Add clear descriptions to attract interest."
    },
    {
      icon: Search,
      title: "Find What You Need",
      description: "Browse available items by category or search for specific products. Save favorites to your list."
    },
    {
      icon: RefreshCw,
      title: "Propose a Swap",
      description: "Make an exchange offer and chat with other users to finalize details. Meet up and complete the swap!"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            How EcoSwapSquare Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start exchanging items and building a more sustainable future
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center group">
              <div className="relative mb-8">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent transform -translate-y-1/2 z-0"></div>
                )}
                
                {/* Step Number */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold z-10">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <step.icon className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;