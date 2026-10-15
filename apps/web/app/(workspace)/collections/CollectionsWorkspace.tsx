import type { TrackCollection } from "@weng-lab/genomebrowser";
import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { collectionSummaries } from "./catalog";
import { CollectionPanel } from "./CollectionPanel";
import { CollectionsView } from "./CollectionsView";

export function CollectionsWorkspace({ collection }: { collection: TrackCollection }) {
  return (
    <WorkspacePage
      title="Collections"
      left={{
        title: "Collections",
        children: <CollectionPanel collections={collectionSummaries} selectedId={collection.id} />,
      }}
    >
      <CollectionsView key={collection.id} collection={collection} />
    </WorkspacePage>
  );
}
