import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isMasterUser } from "@/lib/accessControl";

const US_LOCATIONS = [
  { value: "phoenix-az", label: "Phoenix, AZ" },
  { value: "tucson-az", label: "Tucson, AZ" },
  { value: "birmingham-al", label: "Birmingham, AL" },
  { value: "montgomery-al", label: "Montgomery, AL" },
  { value: "little-rock-ar", label: "Little Rock, AR" },
  { value: "los-angeles-ca", label: "Los Angeles, CA" },
  { value: "san-francisco-ca", label: "San Francisco, CA" },
  { value: "san-diego-ca", label: "San Diego, CA" },
  { value: "sacramento-ca", label: "Sacramento, CA" },
  { value: "denver-co", label: "Denver, CO" },
  { value: "colorado-springs-co", label: "Colorado Springs, CO" },
  { value: "hartford-ct", label: "Hartford, CT" },
  { value: "wilmington-de", label: "Wilmington, DE" },
  { value: "jacksonville-fl", label: "Jacksonville, FL" },
  { value: "miami-fl", label: "Miami, FL" },
  { value: "tampa-fl", label: "Tampa, FL" },
  { value: "orlando-fl", label: "Orlando, FL" },
  { value: "atlanta-ga", label: "Atlanta, GA" },
  { value: "savannah-ga", label: "Savannah, GA" },
  { value: "honolulu-hi", label: "Honolulu, HI" },
  { value: "boise-id", label: "Boise, ID" },
  { value: "chicago-il", label: "Chicago, IL" },
  { value: "springfield-il", label: "Springfield, IL" },
  { value: "indianapolis-in", label: "Indianapolis, IN" },
  { value: "des-moines-ia", label: "Des Moines, IA" },
  { value: "wichita-ks", label: "Wichita, KS" },
  { value: "louisville-ky", label: "Louisville, KY" },
  { value: "new-orleans-la", label: "New Orleans, LA" },
  { value: "baton-rouge-la", label: "Baton Rouge, LA" },
  { value: "portland-me", label: "Portland, ME" },
  { value: "baltimore-md", label: "Baltimore, MD" },
  { value: "boston-ma", label: "Boston, MA" },
  { value: "detroit-mi", label: "Detroit, MI" },
  { value: "minneapolis-mn", label: "Minneapolis, MN" },
  { value: "jackson-ms", label: "Jackson, MS" },
  { value: "kansas-city-mo", label: "Kansas City, MO" },
  { value: "st-louis-mo", label: "St. Louis, MO" },
  { value: "billings-mt", label: "Billings, MT" },
  { value: "omaha-ne", label: "Omaha, NE" },
  { value: "las-vegas-nv", label: "Las Vegas, NV" },
  { value: "reno-nv", label: "Reno, NV" },
  { value: "manchester-nh", label: "Manchester, NH" },
  { value: "newark-nj", label: "Newark, NJ" },
  { value: "albuquerque-nm", label: "Albuquerque, NM" },
  { value: "new-york-ny", label: "New York, NY" },
  { value: "buffalo-ny", label: "Buffalo, NY" },
  { value: "charlotte-nc", label: "Charlotte, NC" },
  { value: "raleigh-nc", label: "Raleigh, NC" },
  { value: "fargo-nd", label: "Fargo, ND" },
  { value: "cleveland-oh", label: "Cleveland, OH" },
  { value: "columbus-oh", label: "Columbus, OH" },
  { value: "oklahoma-city-ok", label: "Oklahoma City, OK" },
  { value: "tulsa-ok", label: "Tulsa, OK" },
  { value: "portland-or", label: "Portland, OR" },
  { value: "philadelphia-pa", label: "Philadelphia, PA" },
  { value: "pittsburgh-pa", label: "Pittsburgh, PA" },
  { value: "providence-ri", label: "Providence, RI" },
  { value: "charleston-sc", label: "Charleston, SC" },
  { value: "columbia-sc", label: "Columbia, SC" },
  { value: "sioux-falls-sd", label: "Sioux Falls, SD" },
  { value: "nashville-tn", label: "Nashville, TN" },
  { value: "memphis-tn", label: "Memphis, TN" },
  { value: "houston-tx", label: "Houston, TX" },
  { value: "dallas-tx", label: "Dallas, TX" },
  { value: "austin-tx", label: "Austin, TX" },
  { value: "san-antonio-tx", label: "San Antonio, TX" },
  { value: "salt-lake-city-ut", label: "Salt Lake City, UT" },
  { value: "burlington-vt", label: "Burlington, VT" },
  { value: "virginia-beach-va", label: "Virginia Beach, VA" },
  { value: "richmond-va", label: "Richmond, VA" },
  { value: "seattle-wa", label: "Seattle, WA" },
  { value: "spokane-wa", label: "Spokane, WA" },
  { value: "charleston-wv", label: "Charleston, WV" },
  { value: "milwaukee-wi", label: "Milwaukee, WI" },
  { value: "cheyenne-wy", label: "Cheyenne, WY" },
];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!isMasterUser(user)) {
    return <Navigate to="/" replace />;
  }

  const [agentName, setAgentName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phoneNumberLocation, setPhoneNumberLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid =
    agentName.trim().length > 0 &&
    companyWebsite.trim().length > 0 &&
    phoneNumberLocation.length > 0 &&
    !isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://workflow.egsai.dev/webhook/New-summit-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          agentName: agentName.trim(),
          companyWebsite: companyWebsite.trim(),
          phoneNumberLocation: phoneNumberLocation,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");

        // Check if it's a "no numbers available" error
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.status === "no_numbers_available") {
            throw new Error(errorData.message || "No phone numbers available for the selected location.");
          }
        } catch (parseError) {
          // If JSON parsing fails, use the original error text
        }

        throw new Error(
          `Failed to create Summit-Demo Bot (${response.status}): ${errorText || "Unknown error"}`,
        );
      }

      // Parse response to check for errors even with 200 status
      const responseData = await response.json().catch(() => null);

      if (responseData?.status === "no_numbers_available") {
        throw new Error(
          responseData.message || "No phone numbers available for the selected location. Please choose a different one.",
        );
      }

      toast({
        title: "Success",
        description: `Summit-Demo Bot "${agentName}" is being created. This may take a few moments.`,
      });

      // Reset form
      setAgentName("");
      setCompanyWebsite("");
      setPhoneNumberLocation("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not create the Summit-Demo Bot. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Configure and manage your Summit-Demo Bots.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Create New Summit-Demo Bot</CardTitle>
            <CardDescription>
              Set up a new conversational AI agent for your company demos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  type="text"
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder="Enter agent name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-website">Company Website</Label>
                <Input
                  id="company-website"
                  type="text"
                  value={companyWebsite}
                  onChange={(event) => setCompanyWebsite(event.target.value)}
                  placeholder="example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number-location">Phone Number Location</Label>
                <Select value={phoneNumberLocation} onValueChange={setPhoneNumberLocation}>
                  <SelectTrigger id="phone-number-location">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_LOCATIONS.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end">
                <Button type="submit" disabled={!isFormValid} className="gap-2">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
