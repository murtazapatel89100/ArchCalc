import { Sidebar } from "@/components/Sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 w-full max-w-7xl mx-auto">
      <Sidebar />
      <div className="flex-1 min-w-0 p-6 md:p-10 pb-24 lg:pb-32 overflow-y-auto prose prose-invert prose-blue max-w-none prose-pre:bg-zinc-900 prose-pre:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
