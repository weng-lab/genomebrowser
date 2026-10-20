import { WorkspacePage } from "../../../shared/workspace/WorkspacePage";
import { CollectionsView } from "../../../features/collections/components/CollectionsView";

export default function CollectionsPage() {
  return (
    <WorkspacePage title="Collections">
      <CollectionsView />
    </WorkspacePage>
  );
}
