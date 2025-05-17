"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGeneration } from "@/context/generation-context";

// Sample destinations for Spain
const SAMPLE_DESTINATIONS = [
  {
    name: "Barcelona",
    coordinates: [2.1734, 41.3851],
    description: "Known for its art and architecture",
  },
  {
    name: "Madrid",
    coordinates: [-3.7038, 40.4168],
    description: "Spain's central capital",
  },
  {
    name: "Seville",
    coordinates: [-5.9845, 37.3891],
    description: "Famous for flamenco dancing",
  },
  {
    name: "Granada",
    coordinates: [-3.5986, 37.1773],
    description: "Home to the Alhambra",
  },
  {
    name: "Valencia",
    coordinates: [-0.3763, 39.4699],
    description: "City of arts and sciences",
  },
];

// Initial map view settings
const INITIAL_CENTER = [-3.7038, 40.4168]; // Madrid
const INITIAL_ZOOM = 5;
const GLOBE_ZOOM = 1.5; // Zoomed out to see the globe

export function TripMap() {
  const { isGenerating, generationProgress } = useGeneration();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationRef = useRef<number | null>(null);
  const bearingRef = useRef(0);
  const previousStateRef = useRef({
    isGenerating: false,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });

  // Initialize map
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: INITIAL_CENTER as [number, number],
        zoom: INITIAL_ZOOM,
        projection: "globe", // Use globe projection for 3D effect
      });

      map.current.on("load", () => {
        setMapLoaded(true);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers when map is loaded
  useEffect(() => {
    if (mapLoaded && map.current) {
      // Clear any existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add markers for each destination
      SAMPLE_DESTINATIONS.forEach((destination) => {
        const marker = new mapboxgl.Marker()
          .setLngLat(destination.coordinates as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3>${destination.name}</h3><p>${destination.description}</p>`
            )
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded]);

  // Handle map resize
  useEffect(() => {
    if (map.current) {
      const resizeObserver = new ResizeObserver(() => {
        map.current?.resize();
      });

      if (mapContainer.current) {
        resizeObserver.observe(mapContainer.current);
      }

      return () => {
        if (mapContainer.current) {
          resizeObserver.unobserve(mapContainer.current);
        }
      };
    }
  }, [mapLoaded]);

  // Globe spinning animation
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Store previous state when generation starts
    if (isGenerating && !previousStateRef.current.isGenerating) {
      previousStateRef.current = {
        isGenerating: true,
        center: map.current.getCenter().toArray() as [number, number],
        zoom: map.current.getZoom(),
      };

      // Zoom out to globe view
      map.current.flyTo({
        center: [0, 20], // Centered slightly north for better view
        zoom: GLOBE_ZOOM,
        duration: 3000,
        essential: true,
      });

      // Start rotation after zoom out completes
      setTimeout(() => {
        if (map.current) {
          // Hide markers during globe rotation
          markersRef.current.forEach((marker) => {
            marker.getElement().style.display = "none";
          });

          // Start the rotation animation
          const animateGlobe = () => {
            if (!map.current || !isGenerating) return;

            bearingRef.current = (bearingRef.current + 0.2) % 360;
            map.current.setBearing(bearingRef.current);
            animationRef.current = requestAnimationFrame(animateGlobe);
          };

          animationRef.current = requestAnimationFrame(animateGlobe);
        }
      }, 3000);
    }

    // Return to original view when generation completes
    if (!isGenerating && previousStateRef.current.isGenerating) {
      // Cancel animation
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Return to previous view
      map.current.flyTo({
        center: previousStateRef.current.center as [number, number],
        zoom: previousStateRef.current.zoom,
        bearing: 0,
        duration: 3000,
        essential: true,
      });

      // Show markers again after returning to original view
      setTimeout(() => {
        markersRef.current.forEach((marker) => {
          marker.getElement().style.display = "";
        });
      }, 3000);

      previousStateRef.current.isGenerating = false;
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isGenerating, mapLoaded]);

  return (
    <div className="flex-1 h-full">
      <Card className="h-full rounded-none border-0">
        <CardHeader>
          <CardTitle>Trip Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <div
            ref={mapContainer}
            className="h-full w-full"
            style={{
              background: "#f0f8ff", // Lighter blue fallback
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            {!mapLoaded && (
              <div className="text-center p-4">
                <p>Map loading...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: You need to provide a valid Mapbox access token in the
                  code
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
