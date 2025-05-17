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

  const handleConnectWhatsapp = () => {
    setDialogOpen(true);
  };

  const handleGroupSelect = (groupId: string) => {
    const group = WHATSAPP_GROUPS.find((g) => g.id === groupId);
    setSelectedGroup(groupId);

    // Close dialog and update connected state
    setDialogOpen(false);
    setWhatsappConnected(true);

    // Set some example context based on the selected group
    if (group) {
      setWhatsappContext(
        `Connected to "${group.name}" WhatsApp group.\n\nExample messages would appear here after connecting to the actual WhatsApp API. This would include recent messages, participants, and other relevant information from the group chat.`
      );
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
        <CardContent>
          {!isGenerating ? (
            <form className="space-y-4" onSubmit={handleGeneratePlan}>
              <div className="space-y-2">
                <label htmlFor="trip-name" className="text-sm font-medium">
                  Name of the Trip
                </label>
                <Input id="trip-name" placeholder="e.g., Summer in Spain" />
              </div>

              {!isGenerating && <div></div>}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  WhatsApp Group Chat
                </label>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      onClick={handleConnectWhatsapp}
                      className="w-full bg-primary hover:bg-primary/90">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {whatsappConnected
                        ? `Connected to ${
                            WHATSAPP_GROUPS.find((g) => g.id === selectedGroup)
                              ?.name
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

              {whatsappConnected && (
                <div className="space-y-2">
                  <label
                    htmlFor="whatsapp-context"
                    className="text-sm font-medium">
                    WhatsApp Context
                  </label>
                  <Textarea
                    id="whatsapp-context"
                    value={whatsappContext}
                    onChange={(e) => setWhatsappContext(e.target.value)}
                    rows={4}
                  />
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
                      <Input id="destination" placeholder="e.g., Spain" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="duration" className="text-sm font-medium">
                        Duration
                      </label>
                      <Input id="duration" placeholder="e.g., 7 days" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="dates" className="text-sm font-medium">
                      Travel Dates
                    </label>
                    <Input
                      id="dates"
                      placeholder="e.g., Jun 15 - Jun 22, 2025"
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
                    <Input id="total-budget" placeholder="e.g., $5000" />
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
          ) : (
            <div className="px-6 pb-6">
              <div className="w-full bg-muted rounded-full h-2.5"></div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Processing trip data</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
