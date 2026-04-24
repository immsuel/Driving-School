import Image from "next/image"
import { Check, Shield, UserCheck, Timer } from "lucide-react"

const benefits = [
  { 
    title: "K53 Specialists", 
    desc: "Instructors who know exactly what examiners at Randburg, Sandton, and Centurion look for.",
    icon: Shield 
  },
  { 
    title: "SAPS Cleared", 
    desc: "Every instructor is vetted and cleared for your safety and peace of mind.",
    icon: UserCheck 
  },
  { 
    title: "Dual-Control Fleet", 
    desc: "Late-model vehicles equipped with dual-braking systems for absolute beginner safety.",
    icon: Check 
  },
  { 
    title: "Nerve Management", 
    desc: "Patience-first methodology designed for students who are anxious about South African traffic.",
    icon: Timer 
  },
]

export function WhyUs() {
  return (
    <section id="why-us" className="bg-white py-24 lg:py-40 overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-24">
          
          {/* Content Side */}
          <div className="flex flex-col gap-10 lg:col-span-6">
            <div className="space-y-4">
              <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                The Advantage
              </span>
              <h2 className="text-5xl font-[950] uppercase tracking-tighter text-slate-900 sm:text-6xl lg:text-8xl leading-[0.85]">
                Built for <br />
                <span className="text-indigo-600">The Road.</span>
              </h2>
            </div>

            <p className="max-w-xl text-lg leading-relaxed text-slate-500 font-medium">
              We don&apos;t just teach you to pass a test; we train you to survive the road. Our K53 methodology is the gold standard in driver safety across Gauteng.
            </p>

            {/* Benefit Grid */}
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="group flex flex-col gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <benefit.icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                      {benefit.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image Side */}
          <div className="relative lg:col-span-6">
            <div className="relative aspect-[4/5] w-full lg:aspect-square">
              {/* Soft decorative background element */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-50/50 blur-3xl" />
              
              {/* Main Image Container */}
              <div className="relative h-full w-full overflow-hidden rounded-[40px] shadow-2xl shadow-slate-200">
                <Image
                  src="/images/instructor.jpg"
                  alt="Professional K53 Instructor"
                  fill
                  className="object-cover transition-transform duration-1000 hover:scale-110"
                />
                
                {/* Overlay Gradient for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>

              {/* Success Stat Card */}
              <div className="absolute -bottom-10 -left-6 rounded-3xl bg-white p-8 shadow-2xl shadow-indigo-200/50 lg:-left-10 lg:p-10 border border-slate-50">
                <div className="flex items-center gap-4">
                  <span className="text-7xl font-black tracking-tighter text-indigo-600">98%</span>
                  <div className="h-12 w-px bg-slate-100" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 leading-tight">
                    Pass Rate <br />
                    <span className="text-slate-900">Guaranteed</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Context Labels */}
            <div className="mt-20 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instructors Online</p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Vehicle Ref: K53-D8 / Manual & Auto
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}