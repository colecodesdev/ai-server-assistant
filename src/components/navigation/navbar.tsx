import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="absolute top-5 left-0 right-0 z-100 flex items-center justify-center">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="Old Florida Fish House"
          width={100}
          height={100}
          priority
        />
      </Link>
    </nav>
  );
}
