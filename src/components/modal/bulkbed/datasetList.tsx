import { BulkBedDataset } from "../../tracks/bulkbed/types";
import Form from "../shared/form";

export default function DatasetList({ datasets }: { datasets: BulkBedDataset[] }) {
  return (
    <Form title="Datasets">
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {datasets.map((dataset, index) => (
          <div key={index} style={{ fontSize: "12px", color: "#666" }}>
            {dataset.name}
          </div>
        ))}
      </div>
    </Form>
  );
}