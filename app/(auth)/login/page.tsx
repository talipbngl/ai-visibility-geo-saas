import Link from "next/link";
import type { Metadata } from "next";
import { loginAction } from "@/features/auth/actions/login.action";
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

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};
export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "AI görünürlük paneli hesabınıza giriş yapın.",
};
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Giriş yap</CardTitle>
          <CardDescription>
            Markalarınızın yapay zekâ cevaplarındaki görünürlüğünü takip etmek için giriş yapın.
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

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

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

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Şifrenizi girin"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Giriş yap
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/register" className="text-muted-foreground">
              Hesap oluştur
            </Link>

            <Link href="/forgot-password" className="text-muted-foreground">
              Şifremi unuttum
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}