import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div>
        <Navbar/>
        <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">404 – Seite nicht gefunden</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Die gesuchte Seite existiert nicht oder wurde verschoben.  
        Vielleicht findest du spannende Communities im Feed.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Zur Startseite
          </Link>
        </Button>
      </div>
    </div>
    </div>
    
  )
}
