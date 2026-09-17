import Header from "@/components/Header";
import Hero from "@/components/Hero";
import VideoShowcase from "@/components/VideoShowcase";
import HowItWorks from "@/components/HowItWorks";
import ProductGrid from "@/components/ProductGrid";
import ImpactCalculator from "@/components/ImpactCalculator";
import CommunityStories from "@/components/CommunityStories";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Header />
      <main className="flex-1">
        <Hero />
        <VideoShowcase />
        <HowItWorks />
        <ProductGrid />
        <ImpactCalculator />
        <CommunityStories />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
