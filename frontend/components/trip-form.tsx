"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { WHATSAPP_GROUPS, WhatsAppGroupDialog } from "./whatsapp-group-dialog";
import { useGeneration } from "@/context/generation-context";

function extractSummaryJsonsFromArray(resultArr: string[]) {
  // Find all items that look like JSON objects
  const jsons = resultArr
    .map((str) => {
      try {
        // Only parse if it looks like a JSON object
        if (str.trim().startsWith("{") && str.trim().endsWith("}")) {
          return JSON.parse(str);
        }
      } catch (e) {
        // ignore parse errors
      }
      return null;
    })
    .filter(Boolean);
  return jsons;
}

export function TripForm() {
  const {
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,
  } = useGeneration();
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappContext, setWhatsappContext] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tripTitle, setTripTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("");
  const [dates, setDates] = useState("");
  const [budget, setBudget] = useState("");
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);
  const [connectingWhatsapp, setConnectingWhatsapp] = useState(false);

  const handleConnectWhatsapp = () => {
    setDialogOpen(true);
  };

  const handleGroupSelect = async (groupId: string) => {
    const group = WHATSAPP_GROUPS.find((g) => g.id === groupId);
    setSelectedGroup(groupId);
    setDialogOpen(false);
    setWhatsappConnected(true);

    if (group) {
      setWhatsappLoading(true);
      try {
        const url = `http://localhost:8000/chat-history?chat_name=${encodeURIComponent(
          group.name
        )}&whatsapp_user_name=Dan`;
        console.log("WhatsApp API request:", url);

        const res = await fetch(url);
        const data = await res.json();
        console.log("WhatsApp API response:", data);
        if (data?.result && Array.isArray(data.result)) {
          const summaries = extractSummaryJsonsFromArray(data.result);
          console.log("Parsed summaries:", summaries);
          if (summaries.length > 0) {
            const summary = summaries[0];
            setTripTitle(summary.title || "");
            setRequirements(summary.requirements || "");
            setNames(summary.names || []);
            setDestination(summary.destination || "");
            setDuration(summary.duration || "");
            setDates(summary.dates || "");
            setBudget(summary.budget || "");
            setWhatsappContext("Summary loaded from WhatsApp group.");
            setHasSummary(true);
          } else {
            setWhatsappContext("Could not parse summary.");
            setHasSummary(false);
          }
        } else {
          setWhatsappContext(
            `Connected to "${group.name}" WhatsApp group.\n\nNo summary available.`
          );
        }
      } catch (err) {
        setWhatsappContext(
          `Connected to "${group.name}" WhatsApp group.\n\nFailed to fetch summary.`
        );
      } finally {
        setWhatsappLoading(false);
      }
    }
  };

  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
  };

  return (
    <div className="flex-1 border-r p-4 md:max-w-[50%] overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
        </CardHeader>
        <div className="mb-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                onClick={handleConnectWhatsapp}
                className="w-full bg-primary hover:bg-primary/90">
                <MessageSquare className="mr-2 h-4 w-4" />
                {whatsappConnected
                  ? `Connected to ${
                      WHATSAPP_GROUPS.find((g) => g.id === selectedGroup)?.name
                    }`
                  : "Connect to WhatsApp Group"}
              </Button>
            </DialogTrigger>
            <WhatsAppGroupDialog
              selectedGroup={selectedGroup}
              onGroupSelect={handleGroupSelect}
            />
          </Dialog>
        </div>
        <CardContent>
          {hasSummary && (
            <form className="space-y-4" onSubmit={handleGeneratePlan}>
              <div className="space-y-2">
                <label htmlFor="trip-name" className="text-sm font-medium">
                  Name of the Trip
                </label>
                <Input
                  id="trip-name"
                  placeholder="e.g., Summer in Spain"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                />
              </div>

              {!isGenerating && <div></div>}

              {whatsappConnected && (
                <div className="space-y-2">
                  <label
                    htmlFor="whatsapp-context"
                    className="text-sm font-medium">
                    WhatsApp Context
                  </label>
                  {whatsappLoading ? (
                    <div className="flex items-center space-x-2 py-2">
                      <svg
                        className="animate-spin h-5 w-5 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      <span>Loading WhatsApp summary…</span>
                    </div>
                  ) : (
                    <Textarea
                      id="whatsapp-context"
                      value={whatsappContext}
                      onChange={(e) => setWhatsappContext(e.target.value)}
                      rows={4}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="trip-requirements"
                  className="text-sm font-medium">
                  Trip Requirements & Steps
                </label>
                <Textarea
                  id="trip-requirements"
                  placeholder="Describe your trip requirements, preferences, and any specific steps you want to include..."
                  rows={6}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>

              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="travelers">Travelers</TabsTrigger>
                  <TabsTrigger value="budget">Budget</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="destination"
                        className="text-sm font-medium">
                        Destination
                      </label>
                      <Input
                        id="destination"
                        placeholder="e.g., Spain"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="duration" className="text-sm font-medium">
                        Duration
                      </label>
                      <Input
                        id="duration"
                        placeholder="e.g., 7 days"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="dates" className="text-sm font-medium">
                      Travel Dates
                    </label>
                    <Input
                      id="dates"
                      placeholder="e.g., Jun 15 - Jun 22, 2025"
                      value={dates}
                      onChange={(e) => setDates(e.target.value)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="travelers" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="num-travelers"
                      className="text-sm font-medium">
                      Number of Travelers
                    </label>
                    <Input
                      id="num-travelers"
                      type="number"
                      defaultValue={2}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="traveler-preferences"
                      className="text-sm font-medium">
                      Traveler Preferences
                    </label>
                    <Textarea
                      id="traveler-preferences"
                      placeholder="Any specific preferences for the travelers..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="budget" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="total-budget"
                      className="text-sm font-medium">
                      Total Budget
                    </label>
                    <Input
                      id="total-budget"
                      placeholder="e.g., $5000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="budget-breakdown"
                      className="text-sm font-medium">
                      Budget Breakdown
                    </label>
                    <Textarea
                      id="budget-breakdown"
                      placeholder="How you want to allocate your budget..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90">
                Generate Trip Plan
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
