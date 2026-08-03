import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import SettingsRow from "../components/SettingsRow";
import ToggleRow from "../components/ToggleRow";
import {
  BRANDS,
  EXTRA_OPTIONS,
  FUEL_OPTIONS,
  KM_PRESETS,
  PRICE_STEPS,
  YEAR_PRESETS,
} from "../data/catalog";
import { useSearch } from "../context/SearchContext";
import {
  countActiveExtras,
  formatPrice,
  fuelLabel,
  brandLabel,
  fuelFilterLabel,
  summarizeFilter,
} from "../types";
import { colors, radii, spacing } from "../theme";

type Panel =
  | "root"
  | "brand"
  | "model"
  | "fuel"
  | "price"
  | "priceMin"
  | "priceMax"
  | "year"
  | "yearMin"
  | "yearMax"
  | "km"
  | "extras";

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export default function SearchScreen() {
  const {
    filter,
    setBrand,
    clearBrands,
    setModel,
    setFuel,
    clearFuels,
    setPrice,
    setYear,
    setKm,
    setExtra,
    resetFilter,
    saveCurrent,
  } = useSearch();
  const [panel, setPanel] = useState<Panel>("root");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const brandNames = useMemo(() => Object.keys(BRANDS).sort(), []);
  const filteredBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brandNames;
    return brandNames.filter((b) => b.toLowerCase().includes(q));
  }, [brandNames, query]);

  const models = useMemo(() => {
    const brands = filter.gyartmanyok;
    if (!brands.length) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const b of brands) {
      for (const m of BRANDS[b] ?? []) {
        if (!seen.has(m)) {
          seen.add(m);
          out.push(m);
        }
      }
    }
    return out.sort();
  }, [filter.gyartmanyok]);

  const priceValue =
    filter.arTol == null && filter.arIg == null
      ? "Mindegy"
      : filter.arTol != null && filter.arIg != null
        ? `${formatPrice(filter.arTol)} – ${formatPrice(filter.arIg)}`
        : filter.arIg != null
          ? `– ${formatPrice(filter.arIg)}`
          : `${formatPrice(filter.arTol!)} –`;

  const yearValue =
    filter.evTol == null && filter.evIg == null
      ? "Mindegy"
      : filter.evTol != null && filter.evIg != null
        ? `${filter.evTol} – ${filter.evIg}`
        : filter.evTol != null
          ? `${filter.evTol} –`
          : `– ${filter.evIg}`;

  const kmValue =
    filter.kmTol == null && filter.kmIg == null
      ? "Mindegy"
      : filter.kmTol != null && filter.kmIg != null
        ? `${filter.kmTol} – ${filter.kmIg}`
        : filter.kmIg != null
          ? `– ${filter.kmIg.toLocaleString("hu-HU")} km`
          : `${filter.kmTol!.toLocaleString("hu-HU")} km –`;

  const extrasValue = (() => {
    const n = countActiveExtras(filter);
    return n ? `${n} bekapcsolva` : "Mindegy";
  })();

  function goBack() {
    setQuery("");
    setPanel("root");
  }

  async function onSave() {
    const saved = await saveCurrent();
    if (!saved) {
      Alert.alert("Üres szűrő", "Előbb állíts be legalább egy feltételt.");
      return;
    }
    Alert.alert("Mentve", `Ikon a 4. oldalon: ${saved.icon} ${saved.name}`);
  }

  if (panel === "brand") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Márka" onBack={goBack} rightLabel="Kész" onRightPress={goBack} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Keresés…"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchField}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionLabel}>Kapcsolók — több márka is</Text>
          <Pressable onPress={clearBrands} style={{ marginBottom: 12, marginLeft: 4 }}>
            <Text style={{ color: colors.accent, fontWeight: "500" }}>Összes kikapcsolása</Text>
          </Pressable>
          <Group>
            {filteredBrands.map((brand, i) => (
              <ToggleRow
                key={brand}
                title={brand}
                value={filter.gyartmanyok.includes(brand)}
                onValueChange={(on) => setBrand(brand, on)}
                isFirst={i === 0}
                isLast={i === filteredBrands.length - 1}
              />
            ))}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (panel === "model") {
    return (
      <View style={styles.page}>
        <ScreenHeader
          title="Modell"
          subtitle={filter.gyartmanyok.length ? brandLabel(filter) : "Válassz márkát"}
          onBack={goBack}
        />
        <ScrollView contentContainerStyle={styles.pad}>
          {!filter.gyartmanyok.length ? (
            <Text style={styles.empty}>Előbb kapcsolj be legalább egy márkát.</Text>
          ) : (
            <Group>
              <SettingsRow
                title="Mindegy"
                isFirst
                isLast={!models.length}
                showChevron={false}
                value={!filter.modell ? "✓" : undefined}
                onPress={() => {
                  setModel(null);
                  goBack();
                }}
              />
              {models.map((model, i) => (
                <SettingsRow
                  key={model}
                  title={model}
                  isLast={i === models.length - 1}
                  showChevron={false}
                  value={filter.modell === model ? "✓" : undefined}
                  onPress={() => {
                    setModel(model);
                    goBack();
                  }}
                />
              ))}
            </Group>
          )}
        </ScrollView>
      </View>
    );
  }

  if (panel === "fuel") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Üzemanyag" onBack={goBack} rightLabel="Kész" onRightPress={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionLabel}>Kapcsolók — több is</Text>
          <Pressable onPress={clearFuels} style={{ marginBottom: 12, marginLeft: 4 }}>
            <Text style={{ color: colors.accent, fontWeight: "500" }}>Összes kikapcsolása</Text>
          </Pressable>
          <Group>
            {FUEL_OPTIONS.map((opt, i) => (
              <ToggleRow
                key={opt.key}
                title={opt.label}
                value={filter.fuels.includes(opt.key)}
                onValueChange={(on) => setFuel(opt.key, on)}
                isFirst={i === 0}
                isLast={i === FUEL_OPTIONS.length - 1}
              />
            ))}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (panel === "price") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Ár" onBack={goBack} rightLabel="Kész" onRightPress={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionLabel}>Lépésköz: 500 000 Ft</Text>
          <Group>
            <SettingsRow
              title="Minimum"
              value={filter.arTol == null ? "Mindegy" : formatPrice(filter.arTol)}
              isFirst
              onPress={() => setPanel("priceMin")}
            />
            <SettingsRow
              title="Maximum"
              value={filter.arIg == null ? "Mindegy" : formatPrice(filter.arIg)}
              isLast
              onPress={() => setPanel("priceMax")}
            />
          </Group>
          <Pressable
            onPress={() => setPrice(null, null)}
            style={{ marginTop: 12, marginLeft: 4 }}
          >
            <Text style={{ color: colors.accent, fontWeight: "500" }}>Ár szűrő törlése</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (panel === "priceMin" || panel === "priceMax") {
    const isMin = panel === "priceMin";
    const current = isMin ? filter.arTol : filter.arIg;
    return (
      <View style={styles.page}>
        <ScreenHeader
          title={isMin ? "Minimum ár" : "Maximum ár"}
          onBack={() => setPanel("price")}
          rightLabel="Kész"
          onRightPress={() => setPanel("price")}
        />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            <SettingsRow
              title="Mindegy"
              isFirst
              showChevron={false}
              value={current == null ? "✓" : undefined}
              onPress={() => {
                if (isMin) setPrice(null, filter.arIg);
                else setPrice(filter.arTol, null);
                setPanel("price");
              }}
            />
            {PRICE_STEPS.map((value, i) => (
              <SettingsRow
                key={value}
                title={formatPrice(value)}
                isLast={i === PRICE_STEPS.length - 1}
                showChevron={false}
                value={current === value ? "✓" : undefined}
                onPress={() => {
                  if (isMin) setPrice(value, filter.arIg);
                  else setPrice(filter.arTol, value);
                  setPanel("price");
                }}
              />
            ))}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (panel === "year") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Évjárat" onBack={goBack} rightLabel="Kész" onRightPress={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionLabel}>Évjárat — tól / ig</Text>
          <Group>
            <SettingsRow
              title="Tól"
              value={filter.evTol == null ? "Mindegy" : String(filter.evTol)}
              isFirst
              onPress={() => setPanel("yearMin")}
            />
            <SettingsRow
              title="Ig"
              value={filter.evIg == null ? "Mindegy" : String(filter.evIg)}
              isLast
              onPress={() => setPanel("yearMax")}
            />
          </Group>
          <Pressable
            onPress={() => setYear(null, null)}
            style={{ marginTop: 12, marginLeft: 4 }}
          >
            <Text style={{ color: colors.accent, fontWeight: "500" }}>Évjárat szűrő törlése</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (panel === "yearMin" || panel === "yearMax") {
    const isMin = panel === "yearMin";
    const current = isMin ? filter.evTol : filter.evIg;
    return (
      <View style={styles.page}>
        <ScreenHeader
          title={isMin ? "Évjárat tól" : "Évjárat ig"}
          onBack={() => setPanel("year")}
          rightLabel="Kész"
          onRightPress={() => setPanel("year")}
        />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            <SettingsRow
              title="Mindegy"
              isFirst
              showChevron={false}
              value={current == null ? "✓" : undefined}
              onPress={() => {
                if (isMin) setYear(null, filter.evIg);
                else setYear(filter.evTol, null);
                setPanel("year");
              }}
            />
            {YEAR_STEPS.map((year, i) => (
              <SettingsRow
                key={year}
                title={String(year)}
                isLast={i === YEAR_STEPS.length - 1}
                showChevron={false}
                value={current === year ? "✓" : undefined}
                onPress={() => {
                  if (isMin) setYear(year, filter.evIg);
                  else setYear(filter.evTol, year);
                  setPanel("year");
                }}
              />
            ))}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (panel === "km") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Futott km" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            {KM_PRESETS.map((preset, i) => {
              const selected =
                filter.kmTol === preset.kmTol && filter.kmIg === preset.kmIg;
              return (
                <SettingsRow
                  key={preset.label}
                  title={preset.label}
                  isFirst={i === 0}
                  isLast={i === KM_PRESETS.length - 1}
                  showChevron={false}
                  value={selected ? "✓" : undefined}
                  onPress={() => {
                    setKm(preset.kmTol, preset.kmIg);
                    goBack();
                  }}
                />
              );
            })}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (panel === "extras") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Extrák" onBack={goBack} rightLabel="Kész" onRightPress={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionLabel}>Kapcsolók — nem pipa</Text>
          <Group>
            {EXTRA_OPTIONS.map((opt, i) => (
              <ToggleRow
                key={opt.key}
                title={opt.label}
                value={Boolean(filter.extras[opt.key])}
                onValueChange={(on) => setExtra(opt.key, on)}
                isFirst={i === 0}
                isLast={i === EXTRA_OPTIONS.length - 1}
              />
            ))}
          </Group>
        </ScrollView>
      </View>
    );
  }

  if (!isOpen) {
    return (
      <View style={styles.landing}>
        <Pressable
          onPress={() => {
            setPanel("root");
            setIsOpen(true);
          }}
          style={styles.landingHit}
          accessibilityLabel="Keresés megnyitása"
        >
          <Text style={styles.landingIcon}>🔍</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="Keresés"
        onBack={() => {
          setPanel("root");
          setIsOpen(false);
        }}
        rightLabel="Törlés"
        onRightPress={resetFilter}
      />
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Jármű</Text>
        <Group>
          <SettingsRow
            title="Márka"
            value={brandLabel(filter)}
            isFirst
            onPress={() => setPanel("brand")}
          />
          <SettingsRow
            title="Modell"
            value={filter.modell ?? "Mindegy"}
            isLast
            onPress={() => setPanel("model")}
          />
        </Group>

        <Text style={styles.sectionLabel}>Feltételek</Text>
        <Group>
          <SettingsRow
            title="Üzemanyag"
            value={fuelFilterLabel(filter)}
            isFirst
            onPress={() => setPanel("fuel")}
          />
          <SettingsRow title="Ár" value={priceValue} onPress={() => setPanel("price")} />
          <SettingsRow title="Évjárat" value={yearValue} onPress={() => setPanel("year")} />
          <SettingsRow title="Futott km" value={kmValue} onPress={() => setPanel("km")} />
          <SettingsRow
            title="Extrák"
            value={extrasValue}
            isLast
            onPress={() => setPanel("extras")}
          />
        </Group>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Aktív szűrő</Text>
          <Text style={styles.summaryText}>{summarizeFilter(filter)}</Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={onSave}>
          <Text style={styles.primaryBtnText}>Mentés ikonra (4. oldal)</Text>
        </Pressable>

        <Text style={styles.hint}>Márka: több is bekapcsolható. Extrák: kapcsoló.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  landing: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  landingHit: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  landingIcon: {
    fontSize: 72,
  },
  page: { flex: 1, backgroundColor: colors.bgGrouped },
  pad: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  group: {
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  searchField: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  empty: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: 16,
  },
  summaryBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryText: { fontSize: 16, color: colors.text, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  hint: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
});
