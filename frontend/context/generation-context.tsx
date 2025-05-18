"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";

interface GenerationContextType {
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  generationProgress: number;
  setGenerationProgress: React.Dispatch<React.SetStateAction<number>>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(
  undefined
);

export function GenerationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  return (
    <GenerationContext.Provider
      value={{
        isGenerating,
        setIsGenerating,
        generationProgress,
        setGenerationProgress,
      }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}
