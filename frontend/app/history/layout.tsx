export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background-color: #060d1f !important; }`}</style>
      {children}
    </>
  );
}
