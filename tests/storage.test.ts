import { describe, expect, it } from "vitest";
import { detectFileType } from "@/server/services/storage";

describe("detectFileType", () => {
  it("reconnaît PDF, JPEG et PNG par leur contenu", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7 ..."))?.mime).toBe("application/pdf");
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe("image/png");
  });
  it("refuse un fichier déguisé (HTML renommé en .pdf)", () => {
    expect(detectFileType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
  });
});
