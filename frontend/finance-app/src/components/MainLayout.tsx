"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppNavigation from "@/components/AppNavigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppNavigation />
        <main className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
