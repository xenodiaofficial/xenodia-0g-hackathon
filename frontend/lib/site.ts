import type { Metadata } from 'next';

export const SITE_NAME = 'Xenodia';
export const SITE_URL = (process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://xenodia.xyz').replace(/\/+$/, '');
export const SITE_TITLE = 'Xenodia x 0G | Verifiable Agent Capability Market';
export const SITE_DESCRIPTION =
  'Xenodia uses 0G as the evidence layer for agent capability providers, invocation receipts, user reviews, reputation roots, storage roots, and settlement records.';
export const SITE_TWITTER = '@XenodiaX';

export function absoluteUrl(path = '/') {
  if (!path.startsWith('/')) {
    return `${SITE_URL}/${path}`;
  }
  return `${SITE_URL}${path}`;
}

export function buildMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SITE_TWITTER,
    },
  };
}
