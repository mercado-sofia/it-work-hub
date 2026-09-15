export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

export function fileBadge(file: { name: string; type: string }) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return { label: "PDF", className: "bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300" };
  }
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) {
    return { label: "IMG", className: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" };
  }
  if (name.endsWith(".xlsx")) {
    return { label: "XLS", className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" };
  }
  if (name.endsWith(".docx")) {
    return { label: "DOC", className: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" };
  }
  return { label: "FILE", className: "bg-muted text-muted-foreground" };
}
