import { notFound } from "next/navigation";
import { getTrackCollection } from "../catalog";
import { CollectionsWorkspace } from "../CollectionsWorkspace";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  const collection = getTrackCollection(collectionId);
  if (!collection) notFound();
  return <CollectionsWorkspace collection={collection} />;
}
