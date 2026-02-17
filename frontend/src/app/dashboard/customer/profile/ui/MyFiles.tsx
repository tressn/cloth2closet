type FileItem = {
  id: string;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  purpose: string;
  createdAt: Date;
};

export default function MyFiles({ items }: { items: FileItem[] }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">My files</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm opacity-80">No uploads found.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {items.map((f) => (
            <a key={f.id} href={f.url} target="_blank" className="rounded-xl border p-3 block hover:opacity-90">
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">{f.fileName ?? "Untitled file"}</div>
                <div className="text-xs opacity-60">{f.purpose}</div>
              </div>
              <div className="mt-1 text-xs opacity-60 truncate">{f.mimeType ?? ""}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
