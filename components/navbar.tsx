"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Car, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 h-20">
        
        {/* Brand: Professional & Bright */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 transition-all group-hover:shadow-lg group-hover:shadow-indigo-200 group-hover:-translate-y-0.5">
            <Car className="h-5 w-5 text-white" />
          </div>
        </Link>

        {/* Desktop Links: Clean Typography */}
        <div className="hidden items-center gap-10 lg:flex">
          {["Services", "Why Us", "Testimonials"].map((item) => (
            <Link 
              key={item}
              href={`/#${item.toLowerCase().replace(" ", "-")}`} 
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 transition-colors hover:text-indigo-600"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Action Area */}
        <div className="hidden items-center gap-6 md:flex">
          <Link 
            href="tel:+27555123456" 
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50">
              <Phone className="h-3 w-3" />
            </div>
            055 512 3456
          </Link>
          <Button 
            className="h-11 rounded-full bg-indigo-600 px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95" 
            asChild
          >
            <Link href="/booking">Book a Lesson</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="flex items-center justify-center rounded-lg p-2 text-slate-900 bg-slate-50 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu: Clean Overlap */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-[80px] bottom-0 z-50 bg-white px-6 py-10 md:hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col gap-6">
            {["Services", "Why Us", "Testimonials", "Booking"].map((item) => (
              <Link
                key={item}
                href={item === "Booking" ? "/booking" : `/#${item.toLowerCase().replace(" ", "-")}`}
                className="text-4xl font-black uppercase tracking-tighter text-slate-900 active:text-indigo-600"
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </Link>
            ))}
            
            <div className="mt-auto flex flex-col gap-4 pb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Get in touch</p>
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl border-slate-200 bg-white text-sm font-bold uppercase tracking-widest text-slate-900" 
                asChild
              >
                <a href="tel:+27555123456">Call 055 512 3456</a>
              </Button>
              <Button 
                className="h-16 rounded-2xl bg-indigo-600 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-100" 
                asChild
              >
                <Link href="/booking">Start Driving Now</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}