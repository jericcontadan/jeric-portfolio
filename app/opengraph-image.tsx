import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link preview (LinkedIn, Messenger, etc.). Built once at build time.
export const alt = "Jeric Contadan · Full Stack Developer & UI Designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const card = await readFile(join(process.cwd(), "public/card-static.png"), "base64");

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 96px",
          background: "radial-gradient(circle at 85% 10%, #2a1f6b 0%, #0a1024 60%)",
          color: "#eef0f7",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 660 }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#a68cff" }}>
            FULL STACK DEVELOPER · MANILA
          </div>
          <div style={{ marginTop: 20, fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            Jeric Contadan
          </div>
          <div style={{ marginTop: 24, fontSize: 32, color: "#a3abc4", lineHeight: 1.35 }}>
            Modern web apps and business systems, from first client meeting to deployment.
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs <img> */}
        <img
          src={`data:image/png;base64,${card}`}
          width={360}
          height={504}
          alt=""
          style={{ borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
        />
      </div>
    ),
    size,
  );
}
