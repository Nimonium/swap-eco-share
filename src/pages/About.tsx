import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Recycle, Users, Globe, Leaf, Heart, Award, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const About = () => {
  const stats = [
    { label: "Items Swapped", value: "10,000+", icon: Recycle },
    { label: "Active Users", value: "5,000+", icon: Users },
    { label: "Cities", value: "50+", icon: Globe },
    { label: "CO₂ Saved", value: "2.5 tons", icon: Leaf }
  ];

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

  const team = [
    {
      name: "Alex Chen",
      role: "Founder & CEO",
      description: "Environmental engineer passionate about reducing waste through technology."
    },
    {
      name: "Sarah Kim",
      role: "Head of Community",
      description: "Building connections and ensuring every user has a great swapping experience."
    },
    {
      name: "Mike Rodriguez",
      role: "Lead Developer",
      description: "Creating the technology that makes seamless swapping possible."
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
          <Button variant="swap" size="lg">
            Join Our Mission
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>

        {/* Stats Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center border-0 shadow-md">
                  <CardContent className="p-6">
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
                By facilitating item exchanges, we're not just helping people save money and 
                declutter their lives – we're actively reducing consumption, minimizing waste, 
                and building stronger communities.
              </p>
              <Button variant="outline" size="lg">
                Learn More About Our Impact
              </Button>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-primary/20 to-success/20 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <Leaf className="h-24 w-24 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">
                    Every swap makes a difference
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

        {/* Team Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Passionate individuals working to make sustainable sharing accessible to everyone
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center border-0 shadow-md">
                <CardContent className="p-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-success/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">{member.name}</h3>
                  <Badge variant="secondary" className="mb-3">{member.role}</Badge>
                  <p className="text-muted-foreground">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary to-success py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Start Swapping?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already making a positive impact on the environment 
              while getting amazing items they love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg">
                Sign Up Now
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
                Browse Items
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