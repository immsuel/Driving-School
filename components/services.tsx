import { GraduationCap, Clock, ShieldCheck, Truck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const packages = [
  {
    icon: GraduationCap,
    title: "Code 8 Beginner",
    subtitle: "Light Motor Vehicle",
    description: "The essential K53 foundation. Covers yard maneuvers, incline starts, and city road safety.",
    price: "R220",
    unit: "/ hour",
    features: ["Dual-control vehicle", "Free pickup/dropoff", "K53 Manual incl."],
    highlight: "Most Booked",
    popular: true,
  },
  {
    icon: Truck,
    title: "Code 10 Training",
    subtitle: "Heavy Motor Vehicle",
    description: "Professional instruction for larger vehicles. Perfect for those entering the logistics industry.",
    price: "R280",
    unit: "/ hour",
    features: ["Certified Instructors", "Yard access incl.", "Mock Test ready"],
    highlight: null,
  },
  {
    icon: Clock,
    title: "10-Lesson Block",
    subtitle: "Saver Package",
    description: "Accelerate your progress. A discounted block designed to take you from zero to test-ready.",
    price: "R2,000",
    unit: "/ full block",
    features: ["Save R200", "Priority Scheduling", "Test Booking Assist"],
    highlight: "Best Value",
  },
  {
    icon: ShieldCheck,
    title: "Test Day Prep",
    subtitle: "Final Readiness",
    description: "A focused 2-hour session right before your appointment + use of our car for the test.",
    price: "R750",
    unit: "/ session",
    features: ["Route pre-drive", "Nerves management", "Vehicle for test"],
    highlight: "High Pass Rate",
  },
]

export function Services() {
  return (
    <section id="services" className="bg-slate-50 py-20 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">
            Pricing & Packages
          </span>
          <h2 className="text-4xl font-[950] uppercase tracking-tighter text-slate-900 sm:text-5xl lg:text-6xl">
            Master the <span className="text-indigo-600">K53 Standard.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-slate-500 font-medium">
            Affordable, professional driving lessons tailored to your schedule. No hidden costs, just quality instruction.
          </p>
        </div>

        {/* Modern Card Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div 
              key={pkg.title}
              className={`group relative flex flex-col rounded-3xl bg-white p-8 transition-all duration-300 hover:-translate-y-2 ${
                pkg.popular ? 'ring-2 ring-indigo-600 shadow-2xl shadow-indigo-100' : 'border border-slate-100 shadow-xl shadow-slate-200/50'
              }`}
            >
              {/* Highlight Badge */}
              {pkg.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white rounded-full shadow-lg">
                  {pkg.highlight}
                </div>
              )}

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                <pkg.icon className="h-7 w-7" />
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {pkg.title}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/60">
                  {pkg.subtitle}
                </p>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-500 font-medium min-h-[60px]">
                {pkg.description}
              </p>

              <div className="mb-6 flex items-baseline gap-1 pt-6 border-t border-slate-50">
                <span className="text-4xl font-black text-slate-900">{pkg.price}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{pkg.unit}</span>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                variant={pkg.popular ? "default" : "outline"}
                className={`w-full h-14 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  pkg.popular 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200" 
                  : "border-slate-200 text-slate-900 bg-transparent hover:bg-slate-900 hover:text-white hover:border-slate-900"
                }`}
              >
                Secure Slot
              </Button>
            </div>
          ))}
        </div>
        
        {/* Trust Footer */}
        <div className="mt-16 flex flex-col items-center justify-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            * All prices exclude DLTC booking fees. Terms & Conditions apply.
          </p>
          <div className="h-px w-24 bg-slate-200" />
        </div>
      </div>
    </section>
  )
}