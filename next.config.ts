import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	// Allow cross-origin iframe embedding for checkout, upsell, and confirmation pages
	async headers() {
		return [
			{
				// Allow embedding checkout page from any origin using CSP
				source: "/checkout",
				headers: [
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors *;",
					},
				],
			},
			{
				// Allow embedding upsell page from any origin using CSP
				source: "/upsell",
				headers: [
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors *;",
					},
				],
			},
			{
				// Allow embedding confirmation page from any origin using CSP
				source: "/confirmation",
				headers: [
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors *;",
					},
					{
						key: "Cache-Control",
						value: "no-store, no-cache, must-revalidate, proxy-revalidate",
					},
					{
						key: "Pragma",
						value: "no-cache",
					},
					{
						key: "Expires",
						value: "0",
					},
				],
			},
			{
				// Allow embedding the embed.js script
				source: "/embed.js",
				headers: [
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors *;",
					},
				],
			},
		];
	},
};

export default withWhopAppConfig(nextConfig);
