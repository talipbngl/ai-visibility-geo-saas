# Security Foundation — Uygulama Sırası

Bu paket `ai-visibility-geo-saas` reposunun `3fb1441` commit'i üzerine hazırlanmıştır.

## 1. Mevcut çalışmayı koru

Proje klasöründe değişiklik varsa önce commit et:

```powershell
git status
git add .
git commit -m "chore: save work before security foundation"
```

## 2. Dosyaları proje köküne çıkar

ZIP içindeki klasör yapısını koruyarak dosyaları
`C:\Users\DELL\Desktop\ai-visibility-geo-saas` klasörüne çıkar ve mevcut
dosyaların üzerine yazılmasına izin ver.

## 3. Supabase migration dosyasını çalıştır

Supabase Dashboard > SQL Editor > New query bölümünde şu dosyanın tamamını
çalıştır:

`database/migrations/202607200001_security_hardening.sql`

Bu işlem recommendation RLS yetkilerini workspace ile sınırlar ve public lead
formu için sunucu taraflı saatlik limit tablosu/fonksiyonu oluşturur.

## 4. `.env.local` değerlerini ekle

```env
ADMIN_EMAILS=uygulamaya-giris-yaptigin-email@example.com
RATE_LIMIT_SALT=uzun-rastgele-bir-deger
```

`ADMIN_EMAILS` virgülle ayrılmış birden fazla email kabul eder. Yalnızca bu
listedeki hesaplar `/dashboard/leads` ve `/dashboard/health` sayfalarını görür.

Güçlü bir salt üretmek için proje terminalinde:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

çıktısını `RATE_LIMIT_SALT` değeri olarak kullan.

## 5. Kontrol et

```powershell
npm run lint
npm run build
```

Ardından uygulamayı yeniden başlat:

```powershell
npm run dev
```

## 6. Manuel testler

1. Admin email ile giriş yap: `Talepler` ve `Sistem Kontrol` görünmeli.
2. Farklı bir kullanıcıyla giriş yap: bu iki menü görünmemeli; URL elle
   açılırsa dashboard'a dönmeli.
3. Public rapor formunu doldur: kayıt Supabase'e ve Telegram'a gitmeli.
4. Aynı bağlantıdan bir saat içinde altıncı form denemesi engellenmeli.
5. Website alanına `http://127.0.0.1` veya `http://localhost` girilirse analiz
   engellenmeli.
6. Normal public bir website analizi çalışmalı.

## Dosyaların amacı

- `lib/security/public-website-url.ts`: localhost, private IP, dahili alan adı,
  standart dışı port ve tehlikeli redirect hedeflerini engeller.
- `lib/security/request-rate-limit.ts`: IP bilgisini salt ile hash'leyip lead
  formunda saatlik beş istek sınırı uygular.
- `lib/auth/platform-admin.ts`: admin emaillerini `.env.local` üzerinden
  doğrular.
- `database/migrations/202607200001_security_hardening.sql`: RLS açığını kapatır
  ve rate-limit RPC'sini oluşturur.
- `app/api/lead-requests/route.ts`: Zod doğrulama, boyut sınırı, honeypot,
  rate-limit ve güvenli Telegram hata yönetimi ekler.
- `lib/website-analysis/analyze-website.ts`: her redirect'i doğrular ve en fazla
  2 MB HTML indirir.
