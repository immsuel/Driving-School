
import BookingForm from "@/components/booking-form"
import { redirect } from "next/navigation"

export default function HomePage() {
  
  redirect("https://deec.simplybook.me/v2/#book/category/2/service/15/count/1/")
  
  return (
    <div className="flex min-h-screen flex-col">
      {/*<BookingForm/> */}
    </div>
  )
}


