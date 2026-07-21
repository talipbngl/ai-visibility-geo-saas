import Link from "next/link";
import type { Metadata } from "next";
import { forgotPasswordAction } from "@/features/auth/actions/forgot-password.action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description: "Hesabınız için şifre sıfırlama bağlantısı isteyin.",
};
type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Şifremi unuttum</CardTitle>
          <CardDescription>
            E-posta adresinizi girin, şifre sıfırlama bağlantısını gönderelim.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {params.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{params.error}</AlertDescription>
            </Alert>
          ) : null}

          {params.message ? (
            <Alert className="mb-4">
              <AlertDescription>{params.message}</AlertDescription>
            </Alert>
          ) : null}

          <form action={forgotPasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@firma.com"
                autoComplete="email"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Sıfırlama bağlantısı gönder
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Şifrenizi hatırladınız mı?{" "}
            <Link href="/login" className="font-medium text-foreground">
              Giriş yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}