import { HistoryCard } from "@/components/HistoryCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const historyItems = [
  {
    text: "Welcome to our AI-powered voice generation platform. Experience the future of text-to-speech technology with unparalleled quality.",
    voice: "Aria",
    date: "2 hours ago",
    duration: "0:12",
  },
  {
    text: "This is a demonstration of our advanced voice synthesis capabilities. Our AI models are trained on diverse datasets.",
    voice: "Roger",
    date: "5 hours ago",
    duration: "0:08",
  },
  {
    text: "Create natural-sounding voiceovers for your projects with just a few clicks. Perfect for videos, podcasts, and more.",
    voice: "Sarah",
    date: "1 day ago",
    duration: "0:10",
  },
  {
    text: "Professional voice generation has never been easier. Transform your content with AI-powered speech synthesis.",
    voice: "Daniel",
    date: "2 days ago",
    duration: "0:09",
  },
  {
    text: "Experience crystal-clear audio quality with our state-of-the-art text-to-speech models.",
    voice: "Laura",
    date: "3 days ago",
    duration: "0:07",
  },
  {
    text: "Generate voices in multiple languages and accents. Our platform supports a wide range of linguistic variations.",
    voice: "Charlie",
    date: "4 days ago",
    duration: "0:11",
  },
];

const History = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">History</h1>
          <p className="text-muted-foreground text-lg">View and manage your generated audio files</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your history..."
            className="pl-10"
          />
        </div>

        <div className="space-y-3">
          {historyItems.map((item, index) => (
            <HistoryCard key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default History;
