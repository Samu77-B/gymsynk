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

const emptyTierForm = {
  name: "",
  subtitle: "",
  slug: "",
  pricePerClass: "10",
  sortOrder: 1,
};

const emptyPackForm = {
  label: "",
  price: "",
  sessionCount: "",
  isPayAsYouGo: false,
  note: "",
};

export function AdminGroupTrainingView({ tenantSlug }: { tenantSlug: string }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [classRows, setClassRows] = useState<ClassRow[]>([]);
  const [tierForm, setTierForm] = useState(emptyTierForm);
  const [packForms, setPackForms] = useState<Record<string, typeof emptyPackForm>>(
    {},
  );
  const [editTierId, setEditTierId] = useState<string | null>(null);
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

  async function createTier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/training-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tierForm,
        pricePerClass: Number(tierForm.pricePerClass),
        sortOrder: Number(tierForm.sortOrder),
        subtitle: tierForm.subtitle || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not create tier");
      return;
    }

    setMessage(`${data.tier.name} created.`);
    setTierForm({ ...emptyTierForm, sortOrder: tiers.length + 2 });
    await loadData();
  }

  async function saveTier(tier: Tier) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/training-tiers/${tier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tier.name,
        subtitle: tier.subtitle,
        slug: tier.slug,
        pricePerClass: Number(tier.pricePerClass),
        sortOrder: tier.sortOrder,
        active: tier.active,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update tier");
      return;
    }

    setMessage(`${tier.name} updated.`);
    setEditTierId(null);
    await loadData();
  }

  async function addPack(tierId: string) {
    const form = packForms[tierId] ?? emptyPackForm;
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not add pack option");
      return;
    }

    setMessage("Pack option added.");
    setPackForms((current) => ({ ...current, [tierId]: emptyPackForm }));
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

  function updateTierLocal(tierId: string, patch: Partial<Tier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    );
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
            Use a separate iframe for group training packages on the Reset site
            (alongside the schedule embed).
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
              <Label htmlFor="tierName">Name</Label>
              <Input
                id="tierName"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                placeholder="Tier 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierSubtitle">Subtitle (optional)</Label>
              <Input
                id="tierSubtitle"
                value={tierForm.subtitle}
                onChange={(e) =>
                  setTierForm({ ...tierForm, subtitle: e.target.value })
                }
                placeholder="Hyrox Training"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierSlug">Slug</Label>
              <Input
                id="tierSlug"
                value={tierForm.slug}
                onChange={(e) => setTierForm({ ...tierForm, slug: e.target.value })}
                placeholder="tier-1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierPrice">Headline price per class (£)</Label>
              <Input
                id="tierPrice"
                type="number"
                min={0}
                step={0.01}
                value={tierForm.pricePerClass}
                onChange={(e) =>
                  setTierForm({ ...tierForm, pricePerClass: e.target.value })
                }
                required
              />
            </div>
            <div className="flex items-end md:col-span-2">
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
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTierId(editTierId === tier.id ? null : tier.id)}
            >
              {editTierId === tier.id ? "Done" : "Edit tier"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {editTierId === tier.id ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={tier.name}
                  onChange={(e) => updateTierLocal(tier.id, { name: e.target.value })}
                />
                <Input
                  value={tier.subtitle ?? ""}
                  placeholder="Subtitle"
                  onChange={(e) =>
                    updateTierLocal(tier.id, { subtitle: e.target.value || null })
                  }
                />
                <Input
                  type="number"
                  step={0.01}
                  value={tier.pricePerClass}
                  onChange={(e) =>
                    updateTierLocal(tier.id, { pricePerClass: e.target.value })
                  }
                />
                <Button type="button" onClick={() => void saveTier(tier)}>
                  Save tier
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                £{Number(tier.pricePerClass).toFixed(2)} per class ·{" "}
                {tier.classes.map((item) => item.title).join(", ") || "No classes assigned"}
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deletePack(pack)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Add pack option</Label>
              </div>
              <Input
                placeholder="4 Sessions / Month"
                value={packForms[tier.id]?.label ?? ""}
                onChange={(e) =>
                  setPackForms((current) => ({
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
                value={packForms[tier.id]?.price ?? ""}
                onChange={(e) =>
                  setPackForms((current) => ({
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
                disabled={packForms[tier.id]?.isPayAsYouGo}
                value={packForms[tier.id]?.sessionCount ?? ""}
                onChange={(e) =>
                  setPackForms((current) => ({
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
                value={packForms[tier.id]?.note ?? ""}
                onChange={(e) =>
                  setPackForms((current) => ({
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
                  checked={packForms[tier.id]?.isPayAsYouGo ?? false}
                  onChange={(e) =>
                    setPackForms((current) => ({
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
                        ...tiers.map((tier) => ({
                          value: tier.id,
                          label: tier.name,
                        })),
                      ]}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Unassigned">
                          {tiers.find((tier) => tier.id === row.trainingTierId)?.name ??
                            "Unassigned"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" label="Unassigned">
                          Unassigned
                        </SelectItem>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id} label={tier.name}>
                            {tier.name}
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
