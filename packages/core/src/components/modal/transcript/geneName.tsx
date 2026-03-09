import Form from "../shared/form";
import { useTrackStore } from "../../../store/BrowserContext";
import type { TranscriptTrack } from "../../tracks/transcript/definition";

export default function GeneName({ id, name }: { id: string; name: string }) {
  const editTrack = useTrackStore((state) => state.editTrack);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editTrack<TranscriptTrack>(id, { geneName: e.target.value });
  };

  return (
    <Form title="Highlight Gene">
      <input value={name} onChange={handleChange} className="w-full" />
    </Form>
  );
}
