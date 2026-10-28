/* eslint-disable @next/next/no-img-element -- photo servie par une route protégée, sans optimisation d'image */
export function Avatar({ documentId, name, size = 48 }: { documentId?: string | null; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (documentId) {
    return <img src={`/api/fichiers/${documentId}`} alt={name} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700" style={{ width: size, height: size }} aria-hidden>
      {initials}
    </span>
  );
}
