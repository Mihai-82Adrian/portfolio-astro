export const GET = ({ site }: { site?: URL }) => {
  const origin = (site?.origin ?? 'https://me-mateescu.de').replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};

