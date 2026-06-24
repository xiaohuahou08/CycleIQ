import { Suspense } from "react";
import { AuthLoadingShell } from "@/app/components/AuthShell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <RegisterForm />
    </Suspense>
  );
}
