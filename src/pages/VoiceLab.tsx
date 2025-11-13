import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mic2 } from "lucide-react";

const voices = [
  { name: "Aria", type: "Professional", language: "English", preview: "Female, clear" },
  { name: "Roger", type: "Warm", language: "English", preview: "Male, friendly" },
  { name: "Sarah", type: "Energetic", language: "English", preview: "Female, upbeat" },
  { name: "Daniel", type: "Deep", language: "English", preview: "Male, authoritative" },
  { name: "Laura", type: "Calm", language: "English", preview: "Female, soothing" },
  { name: "Charlie", type: "Young", language: "English", preview: "Male, youthful" },
];

const VoiceLab = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Voice Lab</h1>
            <p className="text-muted-foreground text-lg">Browse and manage your voice library</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Create Voice
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {voices.map((voice) => (
            <Card key={voice.name} className="border-border bg-card hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{voice.name}</CardTitle>
                    <CardDescription>{voice.type}</CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Language</span>
                    <span className="text-foreground">{voice.language}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preview</span>
                    <span className="text-foreground">{voice.preview}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Preview
                  </Button>
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                    Use Voice
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceLab;
