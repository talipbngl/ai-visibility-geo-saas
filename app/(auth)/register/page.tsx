import Link from "next/link";

import { registerAction } from "@/features/auth/actions/register.action";
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

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const query = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Hesap oluştur</CardTitle>
          <CardDescription>
            AI görünürlük panelini kullanmak için kayıt oluştur.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {query.error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
              {query.error}
            </div>
          ) : null}

          {query.message ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm leading-6">
              {query.message}
            </div>
          ) : null}

          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Ad Soyad"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@email.com"
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
                placeholder="En az 6 karakter"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Hesap oluştur
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabın var mı?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Giriş yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}