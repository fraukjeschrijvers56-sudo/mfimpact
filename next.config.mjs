/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include prompt markdown files in serverless bundle
  outputFileTracingIncludes: {
    '/api/analyze-website': ['./lib/prompts/**/*.md', './data/wetgeving-bronnen.json'],
    '/api/wetgeving/drempelcheck/[id]': ['./data/wetgeving-bronnen.json'],
    '/api/clients/[id]/rapport': [
      './public/brand/mf-impact-logo.png',
      './lib/fonts/**',
      './data/wetgeving-bronnen.json',
    ],
  },
};

export default nextConfig;
