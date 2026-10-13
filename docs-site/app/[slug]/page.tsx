import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocPage from "@/components/DocPage";
import { allDocs, docBySlug } from "@/lib/docs";
export const dynamicParams = false;
export function generateStaticParams() { return allDocs().filter((d) => d.slug !== "index").map((d) => ({ slug: d.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = docBySlug((await params).slug);
  return d ? { title: d.title, description: d.summary } : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const d = docBySlug((await params).slug);
  if (!d) notFound();
  return <DocPage doc={d} />;
}
