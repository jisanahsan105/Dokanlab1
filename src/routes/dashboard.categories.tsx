import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/dashboard/categories")({ component: CategoriesPage });

type Cat = { id: string; name: string; image_url: string | null; active: boolean; position: number };

function CategoriesPage() {
  const { store } = useMyStore();
  const [cats, setCats] = useState<Cat[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("categories").select("*")
      .eq("store_id", store.id).order("position", { ascending: true });
    setCats((data ?? []) as Cat[]);
  };
  useEffect(() => { load(); }, [store]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cats.findIndex(c => c.id === active.id);
    const newIdx = cats.findIndex(c => c.id === over.id);
    const next = arrayMove(cats, oldIdx, newIdx).map((c, i) => ({ ...c, position: i }));
    setCats(next);
    // persist new positions
    await Promise.all(next.map(c =>
      supabase.from("categories").update({ position: c.position }).eq("id", c.id)
    ));
  };

  const toggleActive = async (c: Cat) => {
    setCats(cs => cs.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
    await supabase.from("categories").update({ active: !c.active }).eq("id", c.id);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this category? Products will not be deleted.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  if (!store) return null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Drag to reorder. Toggle to show/hide on storefront.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add category</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} category</DialogTitle></DialogHeader>
            <CatForm storeId={store.id} initial={editing} nextPos={cats.length}
              onDone={() => { setOpen(false); setEditing(null); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {cats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No categories yet. Add your first category — then assign products to it.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={cats.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {cats.map(c => (
                <SortableRow key={c.id} c={c}
                  onToggle={() => toggleActive(c)}
                  onEdit={() => { setEditing(c); setOpen(true); }}
                  onDelete={() => onDelete(c.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({ c, onToggle, onEdit, onDelete }:
  { c: Cat; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag">
        <GripVertical className="h-5 w-5" />
      </button>
      {c.image_url
        ? <img src={c.image_url} alt={c.name} className="h-12 w-12 rounded-lg object-cover" />
        : <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">No img</div>}
      <div className="flex-1">
        <div className="font-semibold">{c.name}</div>
        <div className="text-xs text-muted-foreground">Position {c.position + 1}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{c.active ? "Active" : "Hidden"}</span>
        <Switch checked={c.active} onCheckedChange={onToggle} />
      </div>
      <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

function CatForm({ storeId, initial, nextPos, onDone }:
  { storeId: string; initial: Cat | null; nextPos: number; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onUpload = async (file: File) => {
    setUploading(true);
    const path = `${storeId}/cat-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = { store_id: storeId, name, image_url: imageUrl || null };
    const { error } = initial
      ? await supabase.from("categories").update(payload).eq("id", initial.id)
      : await supabase.from("categories").insert({ ...payload, position: nextPos, active: true });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div>
        <Label>Image (optional)</Label>
        <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={uploading} />
        <p className="mt-1 text-xs text-muted-foreground">Recommended 400×400</p>
        {imageUrl && <img src={imageUrl} alt="" className="mt-2 h-20 w-20 rounded object-cover" />}
      </div>
      <Button type="submit" className="w-full" disabled={saving || uploading}>{saving ? "Saving…" : "Save"}</Button>
    </form>
  );
}
