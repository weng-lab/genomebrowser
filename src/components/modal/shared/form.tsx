export default function Form({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingBlock: "5px",
        paddingInline: "10px",
        gap: "3px",
      }}
    >
      <div style={{ fontWeight: "bold" }}>{title}</div>
      {children}
    </div>
  );
}
