import type { Metadata } from 'next';

export const SITE_NAME = 'Xenodia';
export const SITE_URL = (process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://xenodia.xyz').replace(/\/+$/, '');
export const SITE_TITLE = 'Xenodia | Unified AI Gateway for Agentic Systems';
export const SITE_DESCRIPTION =
  'Xenodia is a unified AI gateway for agentic systems, with developer docs, public model pricing, image APIs, async media tasks, and API key access from one platform.';
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
