/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include prompt markdown files in serverless bundle
  outputFileTracingIncludes: {
    '/api/analyze-website': ['./lib/prompts/**/*.md'],
    '/api/clients/[id]/rapport': [
      './public/brand/mf-impact-logo.png',
      './lib/fonts/**',
    ],
  },
};

export default nextConfig;
