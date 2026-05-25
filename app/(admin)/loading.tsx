export default function AdminLoading() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      padding: "1.5rem 0",
      width: "100%",
    }}>
      <svg
        className="animate-spin"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: "var(--warning, #f59e0b)" }}
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
