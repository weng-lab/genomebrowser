import Form from "../shared/form";
import { useTrackStore } from "../../../store/trackStore";
import { TranscriptConfig } from "../../tracks/transcript/types";

export default function GeneName({ id, name }: { id: string; name: string }) {
  const editTrack = useTrackStore((state) => state.editTrack);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editTrack<TranscriptConfig>(id, { geneName: e.target.value });
  };

  return (
    <Form title="Highlight Gene">
      <input value={name} onChange={handleChange} className="w-full" />
    </Form>
  );
}
