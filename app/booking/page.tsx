import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import BookingForm from "@/components/booking-form"
import { Shield, Clock, Star, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Secure Your Slot | DriveRight South Africa",
  description: "Schedule your K53 driving lesson in Gauteng. Professional Code 8, 10, and 14 instruction.",
}

const highlights = [
  { icon: Shield, text: "SABS Approved Vehicles" },
  { icon: Clock, text: "08:00 - 17:00 Schedule" },
  { icon: Star, text: "K53 Certified Instructors" },
  { icon: MapPin, text: "Gauteng Wide Coverage" },
]

export default function BookingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        
        {/* Header Section: Minimal & Prestigious */}
        <section className="relative overflow-hidden bg-slate-50 border-b border-slate-200 py-24">
          {/* Subtle Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#4f46e5_1px,transparent_1px),linear-gradient(to_bottom,#4f46e5_1px,transparent_1px)] [background-size:40px_40px]" />
          
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">Live Availability</span>
              </div>
              
              <h1 className="mb-6 text-5xl font-[950] uppercase tracking-tighter text-slate-900 md:text-6xl">
                Secure Your <span className="text-indigo-600">Training</span> Slot
              </h1>
              
              <p className="mb-12 text-sm font-bold uppercase tracking-[0.15em] text-slate-500 max-w-xl mx-auto leading-relaxed">
                Professional K53 instruction tailored to your schedule. Choose your package and build your itinerary below.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                {highlights.map((h) => (
                  <div key={h.text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                       <h.icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Form Section: Spaced & Focused */}
        <section className="py-20 md:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-6">
            <BookingForm />
          </div>
        </section>

        {/* Success Metrics: The Trust Strip */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 md:grid-cols-3">
            {[
              { label: "Fleet Total", val: "15,000+", sub: "Licensed Graduates" },
              { label: "Success Rate", val: "95%", sub: "First-Time Pass Ratio" },
              { label: "Academy Rating", val: "4.9/5", sub: "Average Student Review" },
            ].map((stat) => (
              <div key={stat.label} className="group relative flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="absolute -left-4 top-0 hidden h-full w-1 bg-indigo-600/10 transition-colors group-hover:bg-indigo-600 sm:block" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 group-hover:text-indigo-600 transition-colors">{stat.label}</p>
                <p className="text-5xl font-[950] tracking-tighter text-slate-900">{stat.val}</p>
                <p className="text-[11px] font-bold uppercase text-slate-500 mt-2 tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}