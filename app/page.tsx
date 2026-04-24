import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { WhyUs } from "@/components/why-us"
import { Testimonials } from "@/components/testimonials"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <WhyUs />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
