import Image from 'next/image';
import Link from 'next/link';

export function BrandMark({ linked = false }: { linked?: boolean }) {
  const content = (
    <>
      <Image
        className="brand-image"
        src="/brand/min-symbol.webp"
        alt=""
        width={38}
        height={38}
        priority
      />
      <span className="brand-wordmark">
        <span>min.</span>Inside
      </span>
    </>
  );

  return linked ? (
    <Link href="/" className="brand-mark" aria-label="min.Inside — на главную">
      {content}
    </Link>
  ) : (
    <div className="brand-mark">{content}</div>
  );
}
