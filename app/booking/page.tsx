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

        {/* Form Section: Spaced & Focused */}
        <section className="">
          <div className="">
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