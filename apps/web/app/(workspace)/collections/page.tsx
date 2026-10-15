import { defaultCollectionId, getTrackCollection } from "./catalog";
import { CollectionsWorkspace } from "./CollectionsWorkspace";

export default function CollectionsPage() {
  return <CollectionsWorkspace collection={getTrackCollection(defaultCollectionId)!} />;
}
