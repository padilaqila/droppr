import Link from "next/link";
import { ButtonPrimary } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center text-text-primary">
      <h1 className="text-4xl font-bold font-sans mb-2">404</h1>
      <p className="text-text-secondary text-body-md mb-6">Halaman tidak ditemukan.</p>
      <Link href="/">
        <ButtonPrimary className="px-4 py-2">Kembali ke Beranda</ButtonPrimary>
      </Link>
    </div>
  );
}
