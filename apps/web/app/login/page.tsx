import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <LoginForm />
    </Suspense>
  );
}
