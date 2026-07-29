import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

import { assertPublicWebsiteUrl } from "@/lib/security/public-website-url";

describe("assertPublicWebsiteUrl", () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it("geçersiz URL değerini reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl("website-değil")
    ).rejects.toThrow("Website URL geçerli değil.");
  });

  it("http ve https dışındaki protokolleri reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl("ftp://example.com")
    ).rejects.toThrow(
      "Sadece http veya https website adresleri analiz edilebilir."
    );
  });

  it("kullanıcı bilgisi içeren URL değerini reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl(
        "https://admin:secret@example.com"
      )
    ).rejects.toThrow(
      "Kullanıcı bilgisi içeren website adresleri analiz edilemez."
    );
  });

  it("standart olmayan portları reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl("https://example.com:8080")
    ).rejects.toThrow(
      "Yalnızca standart website portları analiz edilebilir."
    );
  });

  it("localhost adresini reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl("http://localhost")
    ).rejects.toThrow(
      "Yerel veya dahili ağ adresleri analiz edilemez."
    );
  });

  it("özel IPv4 adresini reddeder", async () => {
    await expect(
      assertPublicWebsiteUrl("http://192.168.1.15")
    ).rejects.toThrow(
      "Özel veya yerel IP adresleri analiz edilemez."
    );
  });

  it("özel IP adresine çözümlenen alan adını reddeder", async () => {
    lookupMock.mockResolvedValue([
      {
        address: "10.0.0.5",
        family: 4,
      },
    ]);

    await expect(
      assertPublicWebsiteUrl("https://example.com")
    ).rejects.toThrow(
      "Website güvenli ve public bir IP adresine çözümlenmedi."
    );
  });

  it("sonuçlardan biri özel IP ise alan adını reddeder", async () => {
    lookupMock.mockResolvedValue([
      {
        address: "93.184.216.34",
        family: 4,
      },
      {
        address: "127.0.0.1",
        family: 4,
      },
    ]);

    await expect(
      assertPublicWebsiteUrl("https://example.com")
    ).rejects.toThrow(
      "Website güvenli ve public bir IP adresine çözümlenmedi."
    );
  });

  it("çözümlenemeyen alan adını reddeder", async () => {
    lookupMock.mockRejectedValue(
      new Error("ENOTFOUND")
    );

    await expect(
      assertPublicWebsiteUrl(
        "https://bulunamayan.example"
      )
    ).rejects.toThrow(
      "Website alan adı çözümlenemedi."
    );
  });

  it("public IP adresine çözümlenen güvenli URL değerini kabul eder", async () => {
    lookupMock.mockResolvedValue([
      {
        address: "93.184.216.34",
        family: 4,
      },
    ]);

    const result = await assertPublicWebsiteUrl(
      "https://example.com"
    );

    expect(result).toBeInstanceOf(URL);
    expect(result.href).toBe("https://example.com/");
    expect(lookupMock).toHaveBeenCalledWith(
      "example.com",
      {
        all: true,
        verbatim: true,
      }
    );
  });
});