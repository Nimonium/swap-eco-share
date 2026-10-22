import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Recycle, Users, Heart, Award, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const About = () => {
  const values = [
    {
      icon: Recycle,
      title: "Sustainability First",
      description: "Every swap reduces waste and promotes circular economy principles."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Built by the community, for the community. We believe in the power of sharing."
    },
    {
      icon: Heart,
      title: "Trust & Safety",
      description: "Verified users, secure transactions, and community guidelines ensure safe swapping."
    },
    {
      icon: Award,
      title: "Quality Focused",
      description: "We maintain high standards for items and user experience on our platform."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <Badge variant="secondary" className="mb-4">
            About EcoSwapSquare
          </Badge>
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Transforming How We Share
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            We're building a world where nothing goes to waste. EcoSwapSquare connects people 
            who want to exchange items, creating a sustainable marketplace that benefits both 
            people and the planet.
          </p>
          <Button asChild variant="swap" size="lg">
            <Link to="/auth">
              Join Our Mission
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>

        {/* Mission Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We believe that one person's unused item is another person's treasure. Our mission 
                is to create a sustainable economy where resources are shared, not wasted.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                By facilitating item exchanges, we're not just helping people declutter their lives
                – we're actively reducing consumption, minimizing waste, and building stronger communities.
              </p>
            </div>
            <div className="relative">
              <div className="relative w-full h-96 rounded-3xl overflow-hidden shadow-2xl border border-border">
                <img
                  src="/showcase/community_swapping.jpg"
                  alt="Community members swapping items in park"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    Community in Action
                  </span>
                  <p className="text-lg font-bold text-white">
                    Every swap keeps quality goods in use and saves carbon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">Our Values</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These core principles guide everything we do at EcoSwapSquare
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="border-0 shadow-md">
                  <CardContent className="p-8">
                    <value.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary to-success py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Start Swapping?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join fellow members who are making a positive impact on the environment 
              while getting items they love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="secondary" size="lg">
                <Link to="/auth">Sign Up Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
                <Link to="/browse">Browse Items</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;