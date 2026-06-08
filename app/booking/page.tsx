import type { Metadata } from "next"
import BookingForm from "@/components/booking-form"
import { Shield, Clock, Star, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Secure Your Slot | Dee's Driver Training Centre South Africa",
  description: "",
}

export default function BookingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        
        {/* Header Section: Minimal & Prestigious */}

        {/* Form Section: Spaced & Focused */}
        <section className="">
          <div className="">
            <BookingForm />
          </div>
        </section>

        {/* Success Metrics: The Trust Strip */}

      </main>
    </div>
  )
}