import { LoginForm } from "@/components/login-form"
import { Navbar } from "@/components/navbar";

export default function LoginPage() {
  return (
    <div>
      <Navbar/>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
