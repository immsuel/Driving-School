import Link from "next/link"
import { Car, Instagram, Facebook, MessageSquare, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 pt-20 pb-10">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-16">
          
          {/* Brand Column - High Presence */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100 transition-all group-hover:scale-110 group-hover:-rotate-3">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-[950] uppercase tracking-tighter text-slate-900">
                Drive<span className="text-indigo-600">Right</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500 font-medium">
              Elite K53 instruction for the modern South African driver. Professional certification across Gauteng and Western Cape since 2012.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: "#" },
                { icon: Facebook, href: "#" },
                { icon: MessageSquare, href: "#" },
              ].map((social, i) => (
                <Link 
                  key={i} 
                  href={social.href} 
                  className="h-11 w-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-md transition-all"
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Nav Links - Services */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Services
            </h3>
            <div className="flex flex-col gap-4">
              {["Code 8 Light", "Code 10 Heavy", "Refresher", "Test Day Hire"].map((item) => (
                <Link key={item} href="/#services" className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {/* Nav Links - Company */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Company
            </h3>
            <div className="flex flex-col gap-4">
              {["Our Methods", "Pricing", "Reviews", "Instructor Login"].map((item) => (
                <Link key={item} href={item === "Pricing" ? "/packages" : "/#"} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Column - Contact Info */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Headquarters
            </h3>
            <div className="space-y-6">
              <a href="tel:0114428000" className="group block">
                <div className="flex items-center gap-3 mb-1">
                  <Phone className="h-3 w-3 text-indigo-600" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Direct Line</p>
                </div>
                <p className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">011 442 8000</p>
              </a>
              
              <a href="mailto:bookings@driveright.co.za" className="group block">
                <div className="flex items-center gap-3 mb-1">
                  <Mail className="h-3 w-3 text-indigo-600" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Email Support</p>
                </div>
                <p className="text-sm font-bold text-slate-700">bookings@driveright.co.za</p>
              </a>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-indigo-600 mt-1 shrink-0" />
                <p className="text-xs font-bold leading-relaxed text-slate-500 uppercase tracking-widest">
                  14 Bond Street, Randburg<br />
                  Johannesburg, 2194
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-10 sm:flex-row">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              © 2026 DriveRight Academy
            </p>
            <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-300" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600/50">
              Gauteng • Western Cape • KZN
            </p>
          </div>
          <div className="flex gap-8">
            <Link href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}