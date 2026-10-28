import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page introuvable</h1>
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">
        Revenir à l&apos;accueil
      </Link>
    </div>
  );
}
