/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include prompt markdown files in serverless bundle
  experimental: {
    outputFileTracingIncludes: {
      '/api/analyze-website': ['./lib/prompts/**/*.md'],
    },
  },
};

export default nextConfig;
