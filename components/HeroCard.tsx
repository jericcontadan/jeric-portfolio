import Image from "next/image";

/**
 * The hero's card slot. A fixed-aspect box (matches the 1000×1400 static image, 5:7) so nothing
 * shifts when Step 2 swaps the 3D lanyard canvas into this same box.
 * The static image is also the loading and prefers-reduced-motion fallback.
 */
export function HeroCard() {
  return (
    <div className="relative mx-auto aspect-[5/7] w-full max-w-[220px] md:max-w-[260px] lg:max-w-[340px]">
      <Image
        src="/card-static.png"
        alt="ID card: Jeric Contadan, Full Stack Developer, BSIS-3C, TUP Manila"
        fill
        sizes="(min-width: 1024px) 340px, (min-width: 768px) 260px, 220px"
        loading="eager"
        className="object-contain object-top"
      />
    </div>
  );
}
