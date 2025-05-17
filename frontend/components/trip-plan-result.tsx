"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TripPlanResults() {
  return (
    <div className="flex-1 p-4 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your Trip Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p>
              Your AI-generated trip plan will appear here once processing is
              complete.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
