import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="text-center max-w-md">
        <p className="text-6xl font-black text-brand-600 mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2">Vehicle Not Found</h1>
        <p className="text-slate-500 mb-6">
          The page or vehicle you&apos;re looking for doesn&apos;t exist or has
          been removed.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/cars">
            <Button variant="outline">Browse Cars</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
