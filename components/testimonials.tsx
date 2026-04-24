import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Sipho M.",
    location: "Randburg",
    text: "I failed my yard test twice with other schools. DriveRight fixed my parallel parking technique in one hour. Passed my Code 8 today at Randburg DLTC!",
    tag: "Code 8 Graduate",
  },
  {
    name: "Liezel van der Merwe",
    location: "Pretoria East",
    text: "Highly professional. The instructor was on time for every single lesson. Their K53 mock test is exactly like the real thing—it took away all my nerves.",
    tag: "First-Time Pass",
  },
  {
    name: "Kelebogile J.",
    location: "Sandton",
    text: "Top-tier service. They picked me up from work for my lessons and dropped me off. The car was clean and easy to drive. Best driving school in Gauteng.",
    tag: "Intensive Course",
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6">
        
        {/* Header: Centered & Clean */}
        <div className="mb-20 flex flex-col items-center text-center">
          <span className="mb-4 inline-block rounded-full bg-indigo-50 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
            Real Experiences
          </span>
          <h2 className="text-4xl font-[950] uppercase tracking-tighter text-slate-900 sm:text-6xl">
            Our <span className="text-indigo-600">Graduates.</span>
          </h2>
          <div className="mt-6 h-1.5 w-20 rounded-full bg-indigo-600" />
        </div>

        {/* Testimonial Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div 
              key={t.name} 
              className="group relative flex flex-col justify-between rounded-[2rem] bg-slate-50 p-10 transition-all duration-300 hover:bg-white hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 border border-transparent hover:border-slate-100"
            >
              <Quote className="absolute top-8 right-10 h-10 w-10 text-indigo-100 transition-colors group-hover:text-indigo-200" />

              <div>
                <div className="mb-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                <p className="mb-10 text-base leading-relaxed text-slate-600 font-medium italic">
                  {`"${t.text}"`}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Circular Avatar with Gradient */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight text-slate-900">
                    {t.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                    {t.location}
                  </span>
                  <div className="mt-2 rounded-md bg-indigo-50 px-2 py-1 w-fit">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                      {t.tag}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Signals: Clean & Modern */}
        <div className="mt-24 flex flex-wrap justify-center items-center gap-8 md:gap-16">
          <div className="flex flex-col items-center gap-2">
             <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Google Reviews</span>
             <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900">4.9</span>
                <div className="flex gap-0.5">
                   {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                </div>
             </div>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden md:block" />
          <div className="text-center">
             <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Verified</span>
             <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">HelloPeter</p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden md:block" />
          <div className="text-center">
             <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Community</span>
             <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">Facebook Groups</p>
          </div>
        </div>
      </div>
    </section>
  )
}