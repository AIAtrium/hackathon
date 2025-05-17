import { TripForm } from "@/components/trip-form";
import { TripMap } from "@/components/trip-map";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col md:flex-row">
          <TripForm />
          <TripMap />
        </div>
      </div>
    </div>
  );
}
