"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ClassType = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  durationMinutes: number;
  price: string;
};

type ClassForm = {
  title: string;
  description: string;
  capacity: number;
  durationMinutes: number;
  price: string;
};

const emptyForm: ClassForm = {
  title: "",
  description: "",
  capacity: 15,
  durationMinutes: 45,
  price: "0",
};

const textareaClassName =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminClassTypesView({
  onUpdated,
}: {
  onUpdated?: () => void | Promise<void>;
}) {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [addForm, setAddForm] = useState<ClassForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClassForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadClassTypes() {
    const response = await fetch("/api/classes");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not load class types");
      return;
    }

    setClassTypes(data.classes ?? []);
  }

  useEffect(() => {
    void loadClassTypes();
  }, []);

  async function notifyUpdated() {
    await loadClassTypes();
    await onUpdated?.();
  }

  async function createClassType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addForm.title,
        description: addForm.description || null,
        capacity: addForm.capacity,
        durationMinutes: addForm.durationMinutes,
        price: Number(addForm.price),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not add class type");
      return;
    }

    setMessage(`${data.class.title} added. You can now schedule it below.`);
    setAddForm(emptyForm);
    await notifyUpdated();
  }

  function startEdit(classType: ClassType) {
    setEditId(classType.id);
    setEditForm({
      title: classType.title,
      description: classType.description ?? "",
      capacity: classType.capacity,
      durationMinutes: classType.durationMinutes,
      price: classType.price,
    });
    setMessage(null);
    setError(null);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editId) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/classes/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description || null,
        capacity: editForm.capacity,
        durationMinutes: editForm.durationMinutes,
        price: Number(editForm.price),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update class type");
      return;
    }

    setMessage(`${data.class.title} updated.`);
    setEditId(null);
    await notifyUpdated();
  }

  async function deleteClassType(classType: ClassType) {
    if (
      !window.confirm(
        `Delete "${classType.title}"? This only works if no sessions are scheduled for this class.`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/classes/${classType.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not delete class type");
      return;
    }

    setMessage(`${classType.title} deleted.`);
    if (editId === classType.id) {
      setEditId(null);
    }
    await notifyUpdated();
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Class types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define the classes your gym offers — name, duration, capacity, and
            price. Then add them to the timetable below.
          </p>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={createClassType}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addTitle">Class name</Label>
              <Input
                id="addTitle"
                value={addForm.title}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, title: event.target.value }))
                }
                placeholder="e.g. Full Body Strength"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addDescription">Description (optional)</Label>
              <textarea
                id="addDescription"
                className={textareaClassName}
                value={addForm.description}
                onChange={(event) =>
                  setAddForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))
                }
                placeholder="Short description for members and your website."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addDuration">Duration (minutes)</Label>
              <Input
                id="addDuration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={addForm.durationMinutes}
                onChange={(event) =>
                  setAddForm((form) => ({
                    ...form,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addCapacity">Capacity</Label>
              <Input
                id="addCapacity"
                type="number"
                min={1}
                max={500}
                value={addForm.capacity}
                onChange={(event) =>
                  setAddForm((form) => ({
                    ...form,
                    capacity: Number(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addPrice">Price (£)</Label>
              <Input
                id="addPrice"
                type="number"
                min={0}
                step={0.01}
                value={addForm.price}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, price: event.target.value }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Use 0 for classes included in membership or session packs.
              </p>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add class type</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit class type</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveEdit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="editTitle">Class name</Label>
                <Input
                  id="editTitle"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, title: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="editDescription">Description</Label>
                <textarea
                  id="editDescription"
                  className={textareaClassName}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDuration">Duration (minutes)</Label>
                <Input
                  id="editDuration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={editForm.durationMinutes}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCapacity">Capacity</Label>
                <Input
                  id="editCapacity"
                  type="number"
                  min={1}
                  max={500}
                  value={editForm.capacity}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      capacity: Number(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price (£)</Label>
                <Input
                  id="editPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.price}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, price: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">Save changes</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditId(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {classTypes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your class types</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classTypes.map((classType) => (
                  <TableRow key={classType.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{classType.title}</p>
                        {classType.description ? (
                          <p className="text-xs text-muted-foreground">
                            {classType.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{classType.durationMinutes} min</TableCell>
                    <TableCell>{classType.capacity}</TableCell>
                    <TableCell>£{Number(classType.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(classType)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteClassType(classType)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
