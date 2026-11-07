export type BusinessType = "Kafe/Resto" | "Toko" | "Lainnya";

export type BusinessProfile = {
  business_name: string;
  business_type: BusinessType;
};

export type PriceAlerts = {
  threshold_percent: number;
  price_increase: boolean;
  slow_moving: boolean;
};

export type Supplier = {
  id: string;
  name: string;
};

export type TeamMember = {
  id: string;
  email: string;
  role: "Pemilik" | "Staf";
};

export type SettingsData = {
  business: BusinessProfile;
  suppliers: Supplier[];
  alerts: PriceAlerts;
  team: TeamMember[];
};

const mockSettings: SettingsData = {
  business: {
    business_name: "Warung Makan Bu Sari",
    business_type: "Kafe/Resto",
  },
  suppliers: [
    { id: "supplier-1", name: "Pasar Segar Bu Rina" },
    { id: "supplier-2", name: "Toko Grosir Jaya" },
    { id: "supplier-3", name: "Aneka Bahan Kue" },
  ],
  alerts: {
    threshold_percent: 5,
    price_increase: true,
    slow_moving: true,
  },
  team: [
    { id: "member-1", email: "sari@contoh.id", role: "Pemilik" },
    { id: "member-2", email: "andi@contoh.id", role: "Staf" },
  ],
};

function cloneSettings(settings: SettingsData): SettingsData {
  return {
    business: { ...settings.business },
    suppliers: settings.suppliers.map((supplier) => ({ ...supplier })),
    alerts: { ...settings.alerts },
    team: settings.team.map((member) => ({ ...member })),
  };
}

export async function getSettings(): Promise<SettingsData> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return cloneSettings(mockSettings);
}

export async function saveBusinessProfile(
  business: BusinessProfile,
): Promise<BusinessProfile> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  mockSettings.business = { ...business };
  return { ...mockSettings.business };
}

export async function savePriceAlerts(
  alerts: PriceAlerts,
): Promise<PriceAlerts> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  mockSettings.alerts = { ...alerts };
  return { ...mockSettings.alerts };
}

export async function saveSupplier(
  supplier: Supplier,
): Promise<Supplier[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const index = mockSettings.suppliers.findIndex(
    (existing) => existing.id === supplier.id,
  );
  if (index >= 0) {
    mockSettings.suppliers[index] = { ...supplier };
  } else {
    mockSettings.suppliers.push({ ...supplier });
  }
  return mockSettings.suppliers.map((existing) => ({ ...existing }));
}

export async function deleteSupplier(id: string): Promise<Supplier[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  mockSettings.suppliers = mockSettings.suppliers.filter(
    (supplier) => supplier.id !== id,
  );
  return mockSettings.suppliers.map((supplier) => ({ ...supplier }));
}

export async function inviteTeamMember(email: string): Promise<TeamMember[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const normalizedEmail = email.trim().toLocaleLowerCase("id-ID");
  if (
    mockSettings.team.some(
      (member) => member.email.toLocaleLowerCase("id-ID") === normalizedEmail,
    )
  ) {
    throw new Error("Email ini sudah ada di tim.");
  }
  mockSettings.team.push({
    id: `member-${Date.now()}`,
    email: normalizedEmail,
    role: "Staf",
  });
  return mockSettings.team.map((member) => ({ ...member }));
}
