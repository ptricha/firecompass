import { data } from "@/lib/data";
import DetailView from "./DetailView";

export function generateStaticParams() {
  return data.investigations.map((i) => ({ id: i.id }));
}

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailView id={id} />;
}
