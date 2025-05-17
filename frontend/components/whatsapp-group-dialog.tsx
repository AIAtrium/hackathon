"use client";
import { Check } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// WhatsApp groups data
export const WHATSAPP_GROUPS = [
  { id: "start-alumni", name: "START Alumni" },
  { id: "sf-trip-crew", name: "SF Trip Crew" },
  { id: "family", name: "Family" },
  { id: "founders", name: "Founders" },
  { id: "summer-trip-sf-crew", name: "Summer Trip - SF Crew" },
];

interface WhatsAppGroupDialogProps {
  selectedGroup: string | null;
  onGroupSelect: (groupId: string) => void;
}

export function WhatsAppGroupDialog({
  selectedGroup,
  onGroupSelect,
}: WhatsAppGroupDialogProps) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Select WhatsApp Group</DialogTitle>
        <DialogDescription>
          Choose a WhatsApp group to connect to your trip planning.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <RadioGroup
          value={selectedGroup || ""}
          onValueChange={onGroupSelect}
          className="space-y-3">
          {WHATSAPP_GROUPS.map((group) => (
            <div
              key={group.id}
              className={`
                flex items-center justify-between rounded hover:bg-gray-100 transition cursor-pointer px-2 py-1
                ${selectedGroup === group.id ? "bg-gray-100" : ""}
              `}
              onClick={() => onGroupSelect(group.id)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={group.id} id={group.id} />
                <Label
                  htmlFor={group.id}
                  className="text-sm cursor-pointer flex-1 font-normal">
                  {group.name}
                </Label>
              </div>
              {selectedGroup === group.id && (
                <Check className="h-4 w-4 text-primary/70" />
              )}
            </div>
          ))}
        </RadioGroup>
      </div>
    </DialogContent>
  );
}
