import DocPage from "@/components/DocPage";
import { docBySlug } from "@/lib/docs";
export default function Home() { return <DocPage doc={docBySlug("index")!} />; }
