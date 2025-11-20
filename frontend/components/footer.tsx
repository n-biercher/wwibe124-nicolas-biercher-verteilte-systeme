import Link from "next/link";
import { Linkedin } from "lucide-react";

type Props = { authed?: boolean };

export function SiteFooter({ authed = false }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:place-items-center">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight">RED</span>
              <span className="text-sm text-muted-foreground">
                Entdecke deine Community
              </span>
            </Link>
            <p className="mt-3 max-w-[48ch] text-sm text-muted-foreground">
              Schaue dir an was andere zu sagen haben.
            </p>
          </div>

          <nav className="md:col-span-1" aria-label={authed ? "Konto" : "Produkt"}>
            <h3 className="text-sm font-medium">{authed ? "Konto" : "Produkt"}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Entdecken</Link></li>
            <li><Link href="/account" className="hover:text-foreground">Dein Account</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} Nicolas Biercher. 
          </p>

          <div className="flex items-center gap-1.5">
            <SocialLink href="http://www.linkedin.com/in/nicolas-biercher-500b78334" label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-md p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}
