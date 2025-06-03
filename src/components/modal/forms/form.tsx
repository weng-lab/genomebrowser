export default function Form({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingBlock: "5px",
        paddingInline: "10px",
        gap: "3px",
      }}
    >
      {children}
    </div>
  );
}
