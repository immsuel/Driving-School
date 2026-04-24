import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Award, Check } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-[85vh] w-full bg-white selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {/* Subtle Background Accent */}
      <div className="absolute top-0 right-0 -z-10 h-full w-1/3 bg-slate-50/50 hidden lg:block" />
      
      <div className="mx-auto max-w-[1400px] px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* Left Side: Clean & Authoritative */}
          <div className="flex flex-col items-start order-2 lg:order-1">
            
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Premium K53 Academy
              </span>
              <span className="h-px w-8 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Est. 2012 • South Africa
              </span>
            </div>

            <h1 className="mb-6 text-6xl font-[950] uppercase tracking-tighter text-slate-900 sm:text-7xl lg:text-[100px] leading-[0.85]">
              Drive with <br />
              <span className="text-indigo-600">Confidence.</span>
            </h1>

            <p className="mb-8 max-w-md text-base leading-relaxed text-slate-600 lg:text-lg">
              Master the K53 with South Africa&apos;s most patient instructors. 
              <span className="text-slate-900 font-semibold underline decoration-indigo-200 decoration-4 underline-offset-4"> Code 8, 10, & 14</span> training designed for first-time success.
            </p>

            <div className="flex flex-col w-full gap-4 sm:flex-row mb-12">
              <Button size="lg" className="h-16 rounded-xl bg-indigo-600 px-10 text-sm font-bold uppercase tracking-widest text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95" asChild>
                <Link href="/booking">
                  Book Lesson
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 rounded-xl border-slate-200 bg-white px-10 text-sm font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-colors" asChild>
                <Link href="/packages">View Rates</Link>
              </Button>
            </div>

            {/* Micro-stats Bar */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-100 pt-8 w-full">
              {[
                { icon: Check, label: "98% Pass Rate" },
                { icon: MapPin, label: "Door-to-door" },
                { icon: Award, label: "SAPS Cleared" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                    <item.icon className="h-4 w-4 text-indigo-600" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: High-End Visual */}
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 group lg:aspect-[1/1.1]">
              <Image
                src="/images/hero-driving.jpg" 
                alt="Driving School South Africa"
                fill
                className="object-cover group-hover:scale-105 transition-all duration-1000"
                priority
              />
              
              {/* Floating Price Card */}
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 backdrop-blur-sm p-6 shadow-xl border border-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Packages From</p>
                    <p className="text-4xl font-black text-slate-900 leading-none tracking-tighter">R220</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2 flex items-center justify-end gap-1">
                       <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Next Slot: Tomorrow</p>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Gauteng Branch</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Background "K53" - Now in a very light grey */}
            <span className="absolute -right-20 -bottom-10 -z-10 select-none text-[220px] font-black text-slate-100 leading-none">
              K53
            </span>
          </div>

        </div>
      </div>
    </section>
  )
}