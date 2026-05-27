import type { Metadata } from "next"
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