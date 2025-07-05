import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-32 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"></div>
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-full border border-primary/20 mb-6 sm:mb-8 animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-primary">🌱 Connecting Ghana's Farmers & Vendors</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up text-foreground leading-tight">
            Fresh Crops,{" "}
            <span className="gradient-primary bg-clip-text text-transparent">
              Fair Prices
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up px-4 sm:px-0" style={{ animationDelay: "0.1s" }}>
            AgroFresh GH connects local farmers with restaurants, hostels, and consumers across Ghana. 
            Reduce waste, increase profits, and ensure fresh produce reaches every table.
          </p>

          {/* CTA Buttons */}
          {/* <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12 animate-slide-up px-4 sm:px-0" style={{ animationDelay: "0.2s" }}>
            <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 group">
              Start Selling
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 group">
              <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Watch Demo
            </Button>
          </div> */}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto animate-fade-in px-4 sm:px-0" style={{ animationDelay: "0.3s" }}>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">500+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Active Farmers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">1,200+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Vendor Partners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-secondary mb-1">95%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Waste Reduction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
