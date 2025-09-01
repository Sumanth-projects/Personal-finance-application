import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, DollarSign, Receipt, TrendingUp, Upload, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">FinanceTracker</span>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="transition-all hover:shadow-lg hover:-translate-y-0.5">
              <Link href="/register">Start for Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container text-center py-16 lg:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-primary via-blue-400 to-blue-600 bg-clip-text text-transparent">
            Effortless Expense Tracking is Here
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Stop drowning in receipts. Let our AI digitize your expenses, so you can focus on what matters. Your financial clarity starts now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="text-lg px-8 py-6 transition-all hover:shadow-xl hover:-translate-y-1">
              <Link href="/register">Create Your Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 transition-all hover:bg-accent">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container pb-16">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Card className="text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto mb-4 bg-primary/10 rounded-full p-3 w-fit">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <CardTitle>AI-Powered Scanning</CardTitle>
                <CardDescription>
                  Just snap a photo. Our AI instantly captures every detail from your receipts, saving you hours of manual entry.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto mb-4 bg-primary/10 rounded-full p-3 w-fit">
                  <Zap className="h-10 w-10 text-primary" />
                </div>
                <CardTitle>Real-Time Insights</CardTitle>
                <CardDescription>
                  See where your money goes with automatic categorization and beautiful, easy-to-understand spending reports.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto mb-4 bg-primary/10 rounded-full p-3 w-fit">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <CardTitle>Bank-Level Security</CardTitle>
                <CardDescription>
                  Your data is protected with end-to-end encryption. Your privacy and security are our top priority.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-muted/50 py-16">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8 text-center">Everything You Need for Financial Peace of Mind</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Intelligent OCR</h3>
                  <p className="text-muted-foreground text-sm">Our system intelligently extracts vendors, amounts, and dates, minimizing errors.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Full Control</h3>
                  <p className="text-muted-foreground text-sm">Easily review and approve every transaction. You always have the final say.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">All Formats Welcome</h3>
                  <p className="text-muted-foreground text-sm">From crumpled paper receipts to PDF invoices, we can handle it all.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Always Private</h3>
                  <p className="text-muted-foreground text-sm">We never share your data. What's yours stays yours, always.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container text-center py-16 lg:py-24">
          <h2 className="text-3xl font-bold mb-4">Take Control of Your Spending Today</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Sign up in seconds and start your journey towards financial clarity.
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6 transition-all hover:shadow-xl hover:-translate-y-1">
            <Link href="/register">Create Your Free Account</Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 text-center text-muted-foreground">
          <p>&copy; 2025 FinanceTracker. Your finances, simplified.</p>
        </div>
      </footer>
    </div>
  );
}
