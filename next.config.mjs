/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
              protocol: 'https',
              hostname: '**'
            },
        ],
    },
    serverExternalPackages: [
        'mjml',
        'mjml-core',
        'mjml-migrate',
        'mjml-parser-xml',
        'mjml-validator',
    ],
};

export default nextConfig;
