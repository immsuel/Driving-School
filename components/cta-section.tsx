import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react"

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-white py-20 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 shadow-2xl shadow-indigo-200">
          
          {/* Background Decorative Element */}
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/50 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

          <div className="relative grid lg:grid-cols-2">
            
            {/* Left Side: High-Impact Call to Action */}
            <div className="flex flex-col justify-center px-8 py-16 lg:px-20 lg:py-24">
              <div className="mb-8 flex items-center gap-3">
                <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                  Final Step
                </span>
                <span className="h-px w-8 bg-white/20" />
              </div>
              
              <h2 className="mb-8 text-5xl font-[950] uppercase tracking-tighter text-white sm:text-6xl lg:text-7xl leading-[0.85]">
                Stop Dreaming. <br />
                <span className="text-indigo-200">Start Driving.</span>
              </h2>
              
              <p className="mb-10 max-w-md text-lg font-medium leading-relaxed text-indigo-50">
                Slots for <span className="font-bold text-white underline decoration-white/40 underline-offset-8">March 2026</span> are filling up in Randburg and Sandton. Join 500+ successful graduates this year.
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button 
                  size="lg" 
                  className="h-16 rounded-2xl bg-white px-10 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:bg-slate-50 transition-all active:scale-95 shadow-xl shadow-black/10" 
                  asChild
                >
                  <Link href="/booking">
                    Book Your Lesson
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 rounded-2xl border-white/30 bg-white/10 px-10 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-indigo-600 transition-all backdrop-blur-sm"
                  asChild
                >
                  <Link href="tel:+27111234567">
                    <Phone className="mr-2 h-4 w-4 fill-current" />
                    011 123 4567
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Side: Clean Roadmap */}
            <div className="relative flex flex-col justify-center bg-white/5 px-8 py-16 backdrop-blur-md lg:px-20 lg:py-24">
              <h3 className="mb-10 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">
                The Path to your License:
              </h3>
              
              <div className="space-y-10">
                {[
                  { step: "01", title: "Learner's Prep", desc: "Master the rules and signs with our digital materials." },
                  { step: "02", title: "Practical Lessons", desc: "Master clutch control and K53 maneuvers in-car." },
                  { step: "03", title: "Test Day Success", desc: "Use our vehicle and expert guidance to pass your test." },
                ].map((item, idx) => (
                  <div key={item.step} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-indigo-300 text-xs font-black text-white">
                        {item.step}
                      </div>
                      {idx !== 2 && <div className="h-full w-px bg-indigo-300/30 my-2" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-white">{item.title}</h4>
                      <p className="text-sm text-indigo-100/70 font-medium leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Watermark Logo */}
              <div className="pointer-events-none absolute -bottom-10 -right-10 select-none opacity-10">
                <span className="text-[180px] font-black text-white leading-none">K53</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}