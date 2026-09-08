import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // experimental: {
  //   serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist']
  // },
  output: 'standalone',
  reactCompiler: true
}

export default nextConfig;
