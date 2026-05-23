const STORAGE_KEY = "aquatrack_guest_data";

interface GuestData {
  filters: GuestFilter[];
  cartridges: GuestCartridge[];
  replacementRecords: GuestRecord[];
  nextId: number;
}

export interface GuestFilter {
  id: number;
  userId: null;
  name: string;
  location: string | null;
  templateType: string;
  installationDate: string | null;
  notes: string | null;
  status: string;
  cartridges: GuestCartridge[];
  createdAt: string;
  updatedAt: string;
}

export interface GuestCartridge {
  id: number;
  filterId: number;
  name: string;
  stageNumber: number;
  lastReplacedDate: string | null;
  intervalDays: number;
  nextReplacementDate: string | null;
  status: string;
  daysRemaining: number | null;
}

export interface GuestRecord {
  id: number;
  filterId: number;
  filterName: string;
  cartridgeId: number;
  cartridgeName: string;
  stageNumber: number;
  replacedAt: string;
  notes: string | null;
}

function load(): GuestData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { filters: [], cartridges: [], replacementRecords: [], nextId: 1 };
}

function save(data: GuestData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(data: GuestData): number {
  const id = data.nextId;
  data.nextId++;
  return id;
}

export function calcStatus(lastReplacedDate: string | null, intervalDays: number) {
  if (!lastReplacedDate) return { status: "healthy", nextReplacementDate: null, daysRemaining: null };
  const last = new Date(lastReplacedDate);
  const next = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.floor((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  let status = "healthy";
  if (daysRemaining <= 0) status = "overdue";
  else if (daysRemaining <= 10) status = "warning";
  return { status, nextReplacementDate: next.toISOString().split("T")[0], daysRemaining };
}

function enrichCartridge(c: GuestCartridge): GuestCartridge {
  const { status, nextReplacementDate, daysRemaining } = calcStatus(c.lastReplacedDate, c.intervalDays);
  return { ...c, status, nextReplacementDate, daysRemaining };
}

function calcFilterStatus(cartridges: GuestCartridge[]): string {
  if (cartridges.some(c => c.status === "overdue")) return "overdue";
  if (cartridges.some(c => c.status === "warning")) return "warning";
  return "healthy";
}

export function guestGetFilters(): GuestFilter[] {
  const data = load();
  return data.filters.map(f => {
    const cartridges = data.cartridges.filter(c => c.filterId === f.id).map(enrichCartridge);
    const status = calcFilterStatus(cartridges);
    return { ...f, status, cartridges };
  });
}

export function guestGetFilter(id: number): GuestFilter | null {
  const data = load();
  const f = data.filters.find(f => f.id === id);
  if (!f) return null;
  const cartridges = data.cartridges.filter(c => c.filterId === id).map(enrichCartridge);
  const status = calcFilterStatus(cartridges);
  return { ...f, status, cartridges };
}

export function guestCreateFilter(input: {
  name: string;
  location?: string | null;
  templateType: string;
  installationDate?: string | null;
  notes?: string | null;
}): GuestFilter {
  const data = load();
  const id = nextId(data);
  const now = new Date().toISOString();
  const filter: GuestFilter = {
    id,
    userId: null,
    name: input.name,
    location: input.location ?? null,
    templateType: input.templateType,
    installationDate: input.installationDate ?? null,
    notes: input.notes ?? null,
    status: "healthy",
    cartridges: [],
    createdAt: now,
    updatedAt: now,
  };
  data.filters.push(filter);
  save(data);
  return filter;
}

export function guestUpdateFilter(id: number, updates: Partial<GuestFilter>): GuestFilter | null {
  const data = load();
  const idx = data.filters.findIndex(f => f.id === id);
  if (idx === -1) return null;
  data.filters[idx] = { ...data.filters[idx], ...updates, updatedAt: new Date().toISOString() };
  save(data);
  return guestGetFilter(id);
}

export function guestDeleteFilter(id: number) {
  const data = load();
  data.filters = data.filters.filter(f => f.id !== id);
  data.cartridges = data.cartridges.filter(c => c.filterId !== id);
  data.replacementRecords = data.replacementRecords.filter(r => r.filterId !== id);
  save(data);
}

export function guestGetCartridges(filterId: number): GuestCartridge[] {
  const data = load();
  return data.cartridges.filter(c => c.filterId === filterId).map(enrichCartridge);
}

export function guestCreateCartridge(filterId: number, input: {
  name: string;
  stageNumber: number;
  intervalDays: number;
  lastReplacedDate?: string | null;
}): GuestCartridge {
  const data = load();
  const id = nextId(data);
  const { status, nextReplacementDate } = calcStatus(input.lastReplacedDate ?? null, input.intervalDays);
  const cartridge: GuestCartridge = {
    id,
    filterId,
    name: input.name,
    stageNumber: input.stageNumber,
    intervalDays: input.intervalDays,
    lastReplacedDate: input.lastReplacedDate ?? null,
    nextReplacementDate,
    status,
    daysRemaining: null,
  };
  data.cartridges.push(cartridge);
  save(data);
  return enrichCartridge(cartridge);
}

export function guestUpdateCartridge(filterId: number, cartridgeId: number, updates: Partial<GuestCartridge>): GuestCartridge | null {
  const data = load();
  const idx = data.cartridges.findIndex(c => c.id === cartridgeId && c.filterId === filterId);
  if (idx === -1) return null;
  data.cartridges[idx] = { ...data.cartridges[idx], ...updates };
  const { status, nextReplacementDate } = calcStatus(data.cartridges[idx].lastReplacedDate, data.cartridges[idx].intervalDays);
  data.cartridges[idx].status = status;
  data.cartridges[idx].nextReplacementDate = nextReplacementDate;
  save(data);
  return enrichCartridge(data.cartridges[idx]);
}

export function guestDeleteCartridge(filterId: number, cartridgeId: number) {
  const data = load();
  data.cartridges = data.cartridges.filter(c => !(c.id === cartridgeId && c.filterId === filterId));
  save(data);
}

export function guestReplaceCartridge(filterId: number, cartridgeId: number, replacedAt?: string, notes?: string | null): GuestCartridge | null {
  const data = load();
  const idx = data.cartridges.findIndex(c => c.id === cartridgeId && c.filterId === filterId);
  if (idx === -1) return null;

  const date = replacedAt ?? new Date().toISOString().split("T")[0];
  const filter = data.filters.find(f => f.id === filterId);
  const c = data.cartridges[idx];

  const { status, nextReplacementDate } = calcStatus(date, c.intervalDays);
  data.cartridges[idx] = { ...c, lastReplacedDate: date, nextReplacementDate, status };

  const rid = nextId(data);
  data.replacementRecords.push({
    id: rid,
    filterId,
    filterName: filter?.name ?? "Unknown",
    cartridgeId,
    cartridgeName: c.name,
    stageNumber: c.stageNumber,
    replacedAt: date,
    notes: notes ?? null,
  });

  save(data);
  return enrichCartridge(data.cartridges[idx]);
}

export function guestReplaceAll(filterId: number, replacedAt?: string, notes?: string | null): GuestCartridge[] {
  const data = load();
  const date = replacedAt ?? new Date().toISOString().split("T")[0];
  const filter = data.filters.find(f => f.id === filterId);

  const updated: GuestCartridge[] = [];
  for (let i = 0; i < data.cartridges.length; i++) {
    if (data.cartridges[i].filterId !== filterId) continue;
    const c = data.cartridges[i];
    const { status, nextReplacementDate } = calcStatus(date, c.intervalDays);
    data.cartridges[i] = { ...c, lastReplacedDate: date, nextReplacementDate, status };
    const rid = nextId(data);
    data.replacementRecords.push({
      id: rid,
      filterId,
      filterName: filter?.name ?? "Unknown",
      cartridgeId: c.id,
      cartridgeName: c.name,
      stageNumber: c.stageNumber,
      replacedAt: date,
      notes: notes ?? null,
    });
    updated.push(enrichCartridge(data.cartridges[i]));
  }
  save(data);
  return updated;
}

export function guestGetFilterHistory(filterId: number): GuestRecord[] {
  const data = load();
  return data.replacementRecords.filter(r => r.filterId === filterId).reverse();
}

export function guestGetAllHistory(): GuestRecord[] {
  const data = load();
  return [...data.replacementRecords].reverse();
}

export function guestGetSummary() {
  const filters = guestGetFilters();
  let totalCartridges = 0;
  let overdueCartridges = 0;
  let healthy = 0, warning = 0, overdue = 0;
  for (const f of filters) {
    totalCartridges += f.cartridges.length;
    overdueCartridges += f.cartridges.filter(c => c.status === "overdue").length;
    if (f.status === "healthy") healthy++;
    else if (f.status === "warning") warning++;
    else overdue++;
  }
  return { total: filters.length, healthy, warning, overdue, totalCartridges, overdueCartridges };
}

export function guestGetUpcoming(withinDays = 30) {
  const filters = guestGetFilters();
  const results: any[] = [];
  for (const f of filters) {
    for (const c of f.cartridges) {
      if (c.daysRemaining !== null && c.daysRemaining <= withinDays) {
        results.push({
          filterId: f.id,
          filterName: f.name,
          cartridgeId: c.id,
          cartridgeName: c.name,
          stageNumber: c.stageNumber,
          nextReplacementDate: c.nextReplacementDate ?? "",
          daysRemaining: c.daysRemaining,
          status: c.status,
        });
      }
    }
  }
  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function guestExportData(): string {
  const data = load();
  return JSON.stringify(data, null, 2);
}

export function guestImportData(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.filters || !Array.isArray(parsed.filters)) return false;
    save(parsed);
    return true;
  } catch {
    return false;
  }
}
