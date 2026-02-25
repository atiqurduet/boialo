import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col animate-page-in">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="text-center px-4">
          <h1 className="text-8xl font-bold text-primary mb-4">৪০৪</h1>
          <p className="text-xl text-foreground mb-2">We're sorry! This page is currently unavailable.</p>
          <p className="text-muted-foreground mb-8">We request you to please try again later.</p>
          <Link to="/"><Button className="btn-primary gap-2"><Home className="w-4 h-4" />Back to Home</Button></Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
