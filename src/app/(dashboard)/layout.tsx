import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
