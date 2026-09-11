"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Pack = {
  id: string;
  label: string;
  sessionCount: number | null;
  price: string;
  isPayAsYouGo: boolean;
  note: string | null;
  sortOrder: number;
  active: boolean;
};

type Tier = {
  id: string;
  name: string;
  subtitle: string | null;
  slug: string;
  pricePerClass: string;
  sortOrder: number;
  active: boolean;
  packs: Pack[];
  classes: Array<{ id: string; title: string }>;
};

type ClassRow = {
  id: string;
  title: string;
  trainingTierId: string | null;
};

type TierForm = {
  name: string;
  subtitle: string;
  slug: string;
  pricePerClass: string;
  sortOrder: number;
  active: boolean;
};

type PackForm = {
  label: string;
  price: string;
  sessionCount: string;
  isPayAsYouGo: boolean;
  note: string;
  sortOrder: number;
};

const emptyTierForm: TierForm = {
  name: "",
  subtitle: "",
  slug: "",
  pricePerClass: "10",
  sortOrder: 1,
  active: true,
};

const emptyPackForm: PackForm = {
  label: "",
  price: "",
  sessionCount: "",
  isPayAsYouGo: false,
  note: "",
  sortOrder: 1,
};

function tierToForm(tier: Tier): TierForm {
  return {
    name: tier.name,
    subtitle: tier.subtitle ?? "",
    slug: tier.slug,
    pricePerClass: tier.pricePerClass,
    sortOrder: tier.sortOrder,
    active: tier.active,
  };
}

function packToForm(pack: Pack): PackForm {
  return {
    label: pack.label,
    price: pack.price,
    sessionCount: pack.sessionCount?.toString() ?? "",
    isPayAsYouGo: pack.isPayAsYouGo,
    note: pack.note ?? "",
    sortOrder: pack.sortOrder,
  };
}

export function AdminGroupTrainingView({ tenantSlug }: { tenantSlug: string }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [classRows, setClassRows] = useState<ClassRow[]>([]);
  const [addTierForm, setAddTierForm] = useState<TierForm>(emptyTierForm);
  const [editTierId, setEditTierId] = useState<string | null>(null);
  const [editTierForm, setEditTierForm] = useState<TierForm>(emptyTierForm);
  const [editPackId, setEditPackId] = useState<string | null>(null);
  const [editPackForm, setEditPackForm] = useState<PackForm>(emptyPackForm);
  const [addPackForms, setAddPackForms] = useState<Record<string, PackForm>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const packagesEmbed = `/embed/${tenantSlug}/packages?theme=reset`;
  const packagesApi = `/api/public/${tenantSlug}/packages`;

  async function loadData() {
    const [tierRes, classRes] = await Promise.all([
      fetch("/api/training-tiers"),
      fetch("/api/classes"),
    ]);

    const tierData = await tierRes.json();
    const classData = await classRes.json();

    if (!tierRes.ok) {
      setError(tierData.error ?? "Could not load tiers");
      return;
    }

    setTiers(tierData.tiers ?? []);
    setClassRows(classData.classes ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function startEditTier(tier: Tier) {
    setEditTierId(tier.id);
    setEditTierForm(tierToForm(tier));
    setEditPackId(null);
    setMessage(null);
    setError(null);
  }

  function cancelEditTier() {
    setEditTierId(null);
    setEditTierForm(emptyTierForm);
  }

  async function createTier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/training-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addTierForm.name,
        subtitle: addTierForm.subtitle || null,
        slug: addTierForm.slug,
        pricePerClass: Number(addTierForm.pricePerClass),
        sortOrder: addTierForm.sortOrder,
        active: addTierForm.active,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not create tier");
      return;
    }

    setMessage(`${data.tier.name} created.`);
    setAddTierForm({ ...emptyTierForm, sortOrder: tiers.length + 2 });
    await loadData();
  }

  async function saveTier() {
    if (!editTierId) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/training-tiers/${editTierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editTierForm.name,
        subtitle: editTierForm.subtitle || null,
        slug: editTierForm.slug,
        pricePerClass: Number(editTierForm.pricePerClass),
        sortOrder: editTierForm.sortOrder,
        active: editTierForm.active,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update tier");
      return;
    }

    setMessage(`${editTierForm.name} updated.`);
    setEditTierId(null);
    await loadData();
  }

  async function deleteTier(tier: Tier) {
    if (
      !window.confirm(
        `Delete ${tier.name}? Pack options will be removed and classes unassigned.`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/training-tiers/${tier.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not delete tier");
      return;
    }

    setMessage(`${tier.name} deleted.`);
    if (editTierId === tier.id) {
      cancelEditTier();
    }
    await loadData();
  }

  async function addPack(tierId: string) {
    const form = addPackForms[tierId] ?? emptyPackForm;
    setMessage(null);
    setError(null);

    const response = await fetch("/api/training-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tierId,
        label: form.label,
        price: Number(form.price),
        sessionCount: form.isPayAsYouGo ? null : Number(form.sessionCount || 0),
        isPayAsYouGo: form.isPayAsYouGo,
        note: form.note || null,
        sortOrder: form.sortOrder,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not add pack option");
      return;
    }

    setMessage("Pack option added.");
    setAddPackForms((current) => ({ ...current, [tierId]: emptyPackForm }));
    await loadData();
  }

  function startEditPack(pack: Pack) {
    setEditPackId(pack.id);
    setEditPackForm(packToForm(pack));
    setMessage(null);
    setError(null);
  }

  async function savePack() {
    if (!editPackId) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/training-packs/${editPackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editPackForm.label,
        price: Number(editPackForm.price),
        sessionCount: editPackForm.isPayAsYouGo
          ? null
          : Number(editPackForm.sessionCount || 0),
        isPayAsYouGo: editPackForm.isPayAsYouGo,
        note: editPackForm.note || null,
        sortOrder: editPackForm.sortOrder,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update pack");
      return;
    }

    setMessage("Pack option updated.");
    setEditPackId(null);
    await loadData();
  }

  async function deletePack(pack: Pack) {
    if (!window.confirm(`Delete "${pack.label}"?`)) {
      return;
    }

    const response = await fetch(`/api/training-packs/${pack.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not delete pack");
      return;
    }

    setMessage("Pack option deleted.");
    if (editPackId === pack.id) {
      setEditPackId(null);
    }
    await loadData();
  }

  async function assignClass(classId: string, trainingTierId: string | null) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainingTierId }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not assign class");
      return;
    }

    setMessage("Class tier updated.");
    await loadData();
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
          <CardTitle>Website embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Changes here update the live packages feed on your website.
          </p>
          <p>
            <span className="font-medium">Packages embed:</span>{" "}
            <a className="break-all underline" href={packagesEmbed} target="_blank" rel="noreferrer">
              {packagesEmbed}
            </a>
          </p>
          <p>
            <span className="font-medium">Public API:</span>{" "}
            <a className="break-all underline" href={packagesApi} target="_blank" rel="noreferrer">
              {packagesApi}
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add tier</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createTier}>
            <div className="space-y-2">
              <Label htmlFor="addTierName">Name</Label>
              <Input
                id="addTierName"
                value={addTierForm.name}
                onChange={(e) =>
                  setAddTierForm({ ...addTierForm, name: e.target.value })
                }
                placeholder="Tier 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addTierSubtitle">Subtitle (optional)</Label>
              <Input
                id="addTierSubtitle"
                value={addTierForm.subtitle}
                onChange={(e) =>
                  setAddTierForm({ ...addTierForm, subtitle: e.target.value })
                }
                placeholder="Hyrox Training"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addTierSlug">Slug</Label>
              <Input
                id="addTierSlug"
                value={addTierForm.slug}
                onChange={(e) =>
                  setAddTierForm({ ...addTierForm, slug: e.target.value })
                }
                placeholder="tier-1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addTierPrice">Headline price per class (£)</Label>
              <Input
                id="addTierPrice"
                type="number"
                min={0}
                step={0.01}
                value={addTierForm.pricePerClass}
                onChange={(e) =>
                  setAddTierForm({ ...addTierForm, pricePerClass: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addTierSort">Display order</Label>
              <Input
                id="addTierSort"
                type="number"
                min={0}
                value={addTierForm.sortOrder}
                onChange={(e) =>
                  setAddTierForm({
                    ...addTierForm,
                    sortOrder: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add tier</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tiers.map((tier) => (
        <Card key={tier.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{tier.name}</CardTitle>
              {tier.subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{tier.subtitle}</p>
              ) : null}
              {!tier.active ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hidden from website
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {editTierId !== tier.id ? (
                <Button variant="outline" size="sm" onClick={() => startEditTier(tier)}>
                  Edit tier
                </Button>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void deleteTier(tier)}
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {editTierId === tier.id ? (
              <form
                className="grid gap-4 rounded-md border p-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveTier();
                }}
              >
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`editName-${tier.id}`}>Tier name</Label>
                  <Input
                    id={`editName-${tier.id}`}
                    value={editTierForm.name}
                    onChange={(e) =>
                      setEditTierForm({ ...editTierForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`editSubtitle-${tier.id}`}>Subtitle</Label>
                  <Input
                    id={`editSubtitle-${tier.id}`}
                    value={editTierForm.subtitle}
                    onChange={(e) =>
                      setEditTierForm({ ...editTierForm, subtitle: e.target.value })
                    }
                    placeholder="Optional — e.g. Hyrox Training"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`editSlug-${tier.id}`}>Slug</Label>
                  <Input
                    id={`editSlug-${tier.id}`}
                    value={editTierForm.slug}
                    onChange={(e) =>
                      setEditTierForm({ ...editTierForm, slug: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`editPrice-${tier.id}`}>Headline price per class (£)</Label>
                  <Input
                    id={`editPrice-${tier.id}`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={editTierForm.pricePerClass}
                    onChange={(e) =>
                      setEditTierForm({
                        ...editTierForm,
                        pricePerClass: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`editSort-${tier.id}`}>Display order</Label>
                  <Input
                    id={`editSort-${tier.id}`}
                    type="number"
                    min={0}
                    value={editTierForm.sortOrder}
                    onChange={(e) =>
                      setEditTierForm({
                        ...editTierForm,
                        sortOrder: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={editTierForm.active}
                    onChange={(e) =>
                      setEditTierForm({ ...editTierForm, active: e.target.checked })
                    }
                  />
                  Show on website embed
                </label>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button type="submit">Save tier</Button>
                  <Button type="button" variant="outline" onClick={cancelEditTier}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                £{Number(tier.pricePerClass).toFixed(2)} per class ·{" "}
                {tier.classes.map((item) => item.title).join(", ") ||
                  "No classes assigned"}
              </p>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tier.packs.map((pack) => (
                    <TableRow key={pack.id}>
                      <TableCell>{pack.label}</TableCell>
                      <TableCell>
                        £{Number(pack.price).toFixed(2)}
                        {pack.isPayAsYouGo ? " / class" : " / month"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pack.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditPack(pack)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void deletePack(pack)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {editPackId &&
            tier.packs.some((pack) => pack.id === editPackId) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit pack option</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void savePack();
                    }}
                  >
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="editPackLabel">Label</Label>
                      <Input
                        id="editPackLabel"
                        value={editPackForm.label}
                        onChange={(e) =>
                          setEditPackForm({ ...editPackForm, label: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPackPrice">Price (£)</Label>
                      <Input
                        id="editPackPrice"
                        type="number"
                        min={0}
                        step={0.01}
                        value={editPackForm.price}
                        onChange={(e) =>
                          setEditPackForm({ ...editPackForm, price: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPackSessions">Sessions per month</Label>
                      <Input
                        id="editPackSessions"
                        type="number"
                        min={1}
                        disabled={editPackForm.isPayAsYouGo}
                        value={editPackForm.sessionCount}
                        onChange={(e) =>
                          setEditPackForm({
                            ...editPackForm,
                            sessionCount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="editPackNote">Note</Label>
                      <Input
                        id="editPackNote"
                        value={editPackForm.note}
                        onChange={(e) =>
                          setEditPackForm({ ...editPackForm, note: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPackSort">Display order</Label>
                      <Input
                        id="editPackSort"
                        type="number"
                        min={0}
                        value={editPackForm.sortOrder}
                        onChange={(e) =>
                          setEditPackForm({
                            ...editPackForm,
                            sortOrder: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editPackForm.isPayAsYouGo}
                        onChange={(e) =>
                          setEditPackForm({
                            ...editPackForm,
                            isPayAsYouGo: e.target.checked,
                          })
                        }
                      />
                      Pay as you go
                    </label>
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <Button type="submit">Save pack</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditPackId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Add pack option</Label>
              </div>
              <Input
                placeholder="4 Sessions / Month"
                value={addPackForms[tier.id]?.label ?? ""}
                onChange={(e) =>
                  setAddPackForms((current) => ({
                    ...current,
                    [tier.id]: {
                      ...(current[tier.id] ?? emptyPackForm),
                      label: e.target.value,
                    },
                  }))
                }
              />
              <Input
                type="number"
                step={0.01}
                placeholder="Price"
                value={addPackForms[tier.id]?.price ?? ""}
                onChange={(e) =>
                  setAddPackForms((current) => ({
                    ...current,
                    [tier.id]: {
                      ...(current[tier.id] ?? emptyPackForm),
                      price: e.target.value,
                    },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Sessions (leave blank for PAYG)"
                disabled={addPackForms[tier.id]?.isPayAsYouGo}
                value={addPackForms[tier.id]?.sessionCount ?? ""}
                onChange={(e) =>
                  setAddPackForms((current) => ({
                    ...current,
                    [tier.id]: {
                      ...(current[tier.id] ?? emptyPackForm),
                      sessionCount: e.target.value,
                    },
                  }))
                }
              />
              <Input
                placeholder="Note (optional)"
                value={addPackForms[tier.id]?.note ?? ""}
                onChange={(e) =>
                  setAddPackForms((current) => ({
                    ...current,
                    [tier.id]: {
                      ...(current[tier.id] ?? emptyPackForm),
                      note: e.target.value,
                    },
                  }))
                }
              />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={addPackForms[tier.id]?.isPayAsYouGo ?? false}
                  onChange={(e) =>
                    setAddPackForms((current) => ({
                      ...current,
                      [tier.id]: {
                        ...(current[tier.id] ?? emptyPackForm),
                        isPayAsYouGo: e.target.checked,
                      },
                    }))
                  }
                />
                Pay as you go
              </label>
              <Button type="button" onClick={() => void addPack(tier.id)}>
                Add pack
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Assign classes to tiers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Select
                      value={row.trainingTierId ?? ""}
                      onValueChange={(value) =>
                        void assignClass(row.id, value || null)
                      }
                      items={[
                        { value: "", label: "Unassigned" },
                        ...tiers.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Unassigned">
                          {tiers.find((t) => t.id === row.trainingTierId)?.name ??
                            "Unassigned"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" label="Unassigned">
                          Unassigned
                        </SelectItem>
                        {tiers.map((t) => (
                          <SelectItem key={t.id} value={t.id} label={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
