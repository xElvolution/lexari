import Link from "next/link";
import Face from "@/components/Face";
export default function NotFound() {
  return <div className="nf"><Face size={88} live /><h1>Page not found</h1><p>That page wandered off. Try search, or head home.</p><Link className="btn" href="/">Back to docs</Link></div>;
}
