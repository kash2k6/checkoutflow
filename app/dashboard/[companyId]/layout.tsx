export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
	params: Promise<{ companyId: string }>;
}) {
	return (
		<div className="flex flex-col gap-4 w-full">{children}</div>
	);
}
