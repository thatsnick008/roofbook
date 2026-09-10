"use client";

import * as React from "react";
import { Bell, BellOff, Cloud, CloudUpload, Database, Download, HardDrive, History, Mail, Moon, Palette, RefreshCw, RotateCcw, Sparkles, Sun, Trash2, Upload } from "lucide-react";
import { clearAllData, saveSettings } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, PageHeader } from "@/components/ui/Primitives";
import { Field, Input, Toggle } from "@/components/ui/Field";
import { useSettings } from "@/hooks/useData";
import { usePush } from "@/hooks/usePush";
import { useSync } from "@/components/providers/SyncProvider";
import { useCurrencyFilter } from "@/components/providers/CurrencyProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { exportBackup, importBackup } from "@/lib/export/backup";
import { exportPortfolioWorkbook } from "@/lib/export/excel";
import { EXPORTS_ENABLED } from "@/lib/features";
import { seedDemoData } from "@/lib/seed";
import { formatDate, cn, titleise } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { APP_VERSION } from "@/lib/version";

export default function SettingsPage() {
  const toast = useToast();
  const settings = useSettings();
  const { currency } = useCurrencyFilter();
  const { theme, setTheme } = useTheme();
  const { status, lastSyncedAt, error, sync } = useSync();
  const push = usePush();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [usage, setUsage] = React.useState<string>("—");

  React.useEffect(() => {
    navigator.storage?.estimate?.().then((estimate) => {
      if (!estimate.usage) return;
      setUsage(`${(estimate.usage / 1024 / 1024).toFixed(1)} MB used`);
    });
  }, []);

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      await importBackup(file, "merge");
      toast("Backup restored");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not read backup", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const wipe = async () => {
    if (!window.confirm("Clear the local copy on this device? Cloud records stay intact and download again on the next sync.")) return;
    await clearAllData();
    toast("Local cache cleared", "info");
  };

  const backupToGoogleSheets = async () => {
    try {
      const response = await fetch("/api/backup/google-sheets", { method: "POST" });
      const result = await response.json().catch(() => ({ error: "Unexpected response" }));
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Backup failed");
      toast("Backed up to Google Sheets");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not back up to Google Sheets", "error");
    }
  };

  const sendTestEmail = async () => {
    const to = settings?.ownerEmail;
    if (!to) {
      toast("Add a reminder email address first", "error");
      return;
    }
    const response = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        reminders: [
          { title: "Test reminder", dueDate: new Date().toISOString().slice(0, 10), daysAway: 0, property: "Portfolio" }
        ]
      })
    });
    const result = await response.json().catch(() => ({ error: "Unexpected response" }));
    toast(response.ok ? "Test email sent" : result.error ?? "Could not send email", response.ok ? "success" : "error");
  };

  const sendTestPush = async () => {
    const response = await fetch("/api/push/test", { method: "POST" });
    const result = await response.json().catch(() => ({ error: "Unexpected response" }));
    toast(response.ok ? "Test push sent" : result.error ?? "Could not send push", response.ok ? "success" : "error");
  };

  const updateApp = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          registration.active?.postMessage({ type: "CLEAR_RUNTIME_CACHES" });
        }
      }
    } finally {
      window.location.reload();
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences, backups and data control — everything stays on this device." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Cloud sync"
            subtitle="Your records live in your private Postgres database and sync to every device you sign in on."
            action={<Cloud size={18} className="text-muted" />}
          />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status === "error" ? "negative" : status === "offline" ? "warning" : "positive"}>
                {status === "syncing" ? "Syncing" : status === "offline" ? "Offline" : status === "error" ? "Error" : "Connected"}
              </Badge>
              <span className="text-sm text-muted">
                Last synced: <span className="font-medium text-fg">{formatDate(lastSyncedAt)}</span>
              </span>
            </div>
            {error ? <p className="text-sm text-negative">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void sync()}>
                <RefreshCw size={16} /> Sync now
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  await sync({ full: true });
                  toast("Local data pushed to the cloud");
                }}
              >
                <CloudUpload size={16} /> Push all local data to cloud
              </Button>
            </div>
            <p className="text-xs text-muted">
              Use &ldquo;push all&rdquo; once after signing in for the first time to upload records you entered before
              cloud sync was enabled.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Profile" subtitle="Used on exported reports and reminder emails" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={settings?.ownerName ?? ""}
                onChange={(event) => saveSettings({ ownerName: event.target.value })}
              />
            </Field>
            <Field label="Reminder email">
              <Input
                type="email"
                value={settings?.ownerEmail ?? ""}
                onChange={(event) => saveSettings({ ownerEmail: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Toggle
                label="Email reminders enabled"
                checked={settings?.remindersEnabled ?? true}
                onChange={(checked) => saveSettings({ remindersEnabled: checked })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button variant="secondary" onClick={sendTestEmail}>
                <Mail size={16} /> Send test reminder email
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Push notifications"
            subtitle="Get reminder alerts on this device, even when Roofbook isn't open"
            action={<Bell size={18} className="text-muted" />}
          />
          <CardBody className="space-y-3">
            {!push.configured ? (
              <p className="text-sm text-muted">Push notifications aren&apos;t configured for this deployment yet.</p>
            ) : push.status === "unsupported" ? (
              <p className="text-sm text-muted">This browser doesn&apos;t support push notifications.</p>
            ) : push.status === "denied" ? (
              <p className="text-sm text-negative">
                Notifications are blocked for this site. Allow them in your browser settings to turn this on.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={push.status === "subscribed" ? "positive" : "warning"}>
                    {push.status === "subscribed" ? "Enabled on this device" : "Not enabled"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {push.status === "subscribed" ? (
                    <Button variant="secondary" disabled={push.loading} onClick={() => void push.unsubscribe()}>
                      <BellOff size={16} /> Turn off on this device
                    </Button>
                  ) : (
                    <Button disabled={push.loading} onClick={() => void push.subscribe()}>
                      <Bell size={16} /> Enable push notifications
                    </Button>
                  )}
                  {push.status === "subscribed" ? (
                    <Button variant="secondary" onClick={sendTestPush}>
                      <Bell size={16} /> Send test push
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" subtitle="Light, dark or follow your device" action={<Palette size={18} className="text-muted" />} />
          <CardBody className="grid grid-cols-3 gap-2">
            {(
              [
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Sparkles]
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  saveSettings({ theme: value });
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition",
                  theme === value ? "border-brand bg-brand/10 text-brand" : "border-border bg-bg/40 text-muted"
                )}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="App update" subtitle={`Current version ${APP_VERSION}`} action={<RefreshCw size={18} className="text-muted" />} />
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              Refresh the installed app shell and load the latest production deployment. Portfolio records stored on this
              device are not cleared.
            </p>
            <Button variant="secondary" onClick={updateApp}>
              <RefreshCw size={16} /> Update to latest version
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Backup & restore" subtitle="Encrypted-at-rest JSON snapshot of your portfolio" action={<Database size={18} className="text-muted" />} />
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              Last backup: <span className="font-medium text-fg">{formatDate(settings?.lastBackupAt)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPORTS_ENABLED ? (
                <Button
                  onClick={async () => {
                    await exportBackup();
                    toast("Backup downloaded");
                  }}
                >
                  <Download size={16} /> Export backup
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Restore backup
              </Button>
              {EXPORTS_ENABLED ? (
                <Button variant="secondary" onClick={() => exportPortfolioWorkbook(undefined, currency)}>
                  <Download size={16} /> Export Excel
                </Button>
              ) : null}
              <Button variant="secondary" onClick={backupToGoogleSheets}>
                <Cloud size={16} /> Backup to Google Sheets
              </Button>
            </div>
            <p className="text-xs text-muted">
              Mirrors properties, purchases, loans, income, expenses, contacts and reminders to a Google Sheet so your
              data survives even if this database is lost. Requires Google Sheets backup to be configured by an admin.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => restore(event.target.files?.[0])}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Storage & data" subtitle={usage} action={<HardDrive size={18} className="text-muted" />} />
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              A local copy of every record is cached in this browser so the app keeps working offline. Reminder emails
              contain only the reminder title and due date.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await seedDemoData();
                  toast("Demo portfolio loaded");
                }}
              >
                <Sparkles size={16} /> Load demo data
              </Button>
              <Button variant="danger" onClick={wipe}>
                <Trash2 size={16} /> Clear local cache
              </Button>
            </div>
          </CardBody>
        </Card>

        <VersionHistoryCard />
      </div>
    </>
  );
}

interface Revision {
  table: string;
  recordId: string;
  version: number;
  label: string;
  createdAt: string;
}

function VersionHistoryCard() {
  const toast = useToast();
  const { sync } = useSync();
  const [revisions, setRevisions] = React.useState<Revision[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [restoring, setRestoring] = React.useState<string>();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/revisions");
      const result = await response.json().catch(() => ({}));
      setRevisions(response.ok && result.ok ? result.revisions : []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const restore = async (revision: Revision) => {
    const key = `${revision.table}:${revision.recordId}:${revision.version}`;
    if (!window.confirm(`Restore "${revision.label}" to version ${revision.version}? The current values are kept as a new version.`)) return;

    setRestoring(key);
    const response = await fetch("/api/revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: revision.table, recordId: revision.recordId, version: revision.version })
    });
    const result = await response.json().catch(() => ({}));
    setRestoring(undefined);

    if (!response.ok || !result.ok) {
      toast(result.error ?? "Could not restore that version", "error");
      return;
    }

    await sync({ full: true });
    await load();
    toast("Version restored");
  };

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Version history"
        subtitle="The last five versions of every record are kept in the cloud. Restore one to roll the dashboard back."
        action={<History size={18} className="text-muted" />}
      />
      <CardBody className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Loading history…</p>
        ) : revisions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No earlier versions yet. Snapshots are captured whenever a record is edited or deleted.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {revisions.map((revision) => {
              const key = `${revision.table}:${revision.recordId}:${revision.version}`;
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{revision.label}</p>
                    <p className="text-xs text-muted">
                      {titleise(revision.table)} · v{revision.version} · {formatDate(revision.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={restoring === key}
                    onClick={() => void restore(revision)}
                  >
                    <RotateCcw size={15} /> {restoring === key ? "Restoring…" : "Restore"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
