import Link from "next/link";
import { registerAction } from "@/features/auth/actions/register.action";
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

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hesap oluştur</CardTitle>
          <CardDescription>
            AI görünürlük paneline başlamak için ücretsiz hesap oluştur.
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

          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Zeliş"
                autoComplete="name"
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
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Kayıt ol
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-medium text-foreground">
              Giriş yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}