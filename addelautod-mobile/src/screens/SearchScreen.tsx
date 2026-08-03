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
  PRICE_PRESETS,
  YEAR_PRESETS,
} from "../data/catalog";
import { useSearch } from "../context/SearchContext";
import {
  countActiveExtras,
  formatPrice,
  fuelLabel,
  summarizeFilter,
} from "../types";
import { colors, radii, spacing } from "../theme";

type Panel =
  | "root"
  | "brand"
  | "model"
  | "fuel"
  | "price"
  | "year"
  | "km"
  | "extras";

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export default function SearchScreen() {
  const {
    filter,
    setBrand,
    setModel,
    setFuel,
    setPrice,
    setYear,
    setKm,
    setExtra,
    resetFilter,
    saveCurrent,
  } = useSearch();
  const [panel, setPanel] = useState<Panel>("root");
  const [query, setQuery] = useState("");

  const brandNames = useMemo(() => Object.keys(BRANDS).sort(), []);
  const filteredBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brandNames;
    return brandNames.filter((b) => b.toLowerCase().includes(q));
  }, [brandNames, query]);

  const models = filter.gyartmany ? BRANDS[filter.gyartmany] ?? [] : [];

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
        <ScreenHeader title="Márka" onBack={goBack} />
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
          <Group>
            <SettingsRow
              title="Mindegy"
              isFirst
              isLast={!filteredBrands.length}
              showChevron={false}
              value={!filter.gyartmany ? "✓" : undefined}
              onPress={() => {
                setBrand(null);
                goBack();
              }}
            />
            {filteredBrands.map((brand, i) => (
              <SettingsRow
                key={brand}
                title={brand}
                isLast={i === filteredBrands.length - 1}
                showChevron={false}
                value={filter.gyartmany === brand ? "✓" : undefined}
                onPress={() => {
                  setBrand(brand);
                  goBack();
                }}
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
          subtitle={filter.gyartmany ?? "Válassz márkát"}
          onBack={goBack}
        />
        <ScrollView contentContainerStyle={styles.pad}>
          {!filter.gyartmany ? (
            <Text style={styles.empty}>Előbb válassz márkát.</Text>
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
        <ScreenHeader title="Üzemanyag" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            <SettingsRow
              title="Mindegy"
              isFirst
              showChevron={false}
              value={filter.fuel == null ? "✓" : undefined}
              onPress={() => {
                setFuel(null);
                goBack();
              }}
            />
            {FUEL_OPTIONS.map((opt, i) => (
              <SettingsRow
                key={opt.key}
                title={opt.label}
                isLast={i === FUEL_OPTIONS.length - 1}
                showChevron={false}
                value={filter.fuel === opt.key ? "✓" : undefined}
                onPress={() => {
                  setFuel(opt.key);
                  goBack();
                }}
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
        <ScreenHeader title="Ár" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            {PRICE_PRESETS.map((preset, i) => {
              const selected =
                filter.arTol === preset.arTol && filter.arIg === preset.arIg;
              return (
                <SettingsRow
                  key={preset.label}
                  title={preset.label}
                  isFirst={i === 0}
                  isLast={i === PRICE_PRESETS.length - 1}
                  showChevron={false}
                  value={selected ? "✓" : undefined}
                  onPress={() => {
                    setPrice(preset.arTol, preset.arIg);
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

  if (panel === "year") {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Évjárat" onBack={goBack} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Group>
            {YEAR_PRESETS.map((preset, i) => {
              const selected =
                filter.evTol === preset.evTol && filter.evIg === preset.evIg;
              return (
                <SettingsRow
                  key={preset.label}
                  title={preset.label}
                  isFirst={i === 0}
                  isLast={i === YEAR_PRESETS.length - 1}
                  showChevron={false}
                  value={selected ? "✓" : undefined}
                  onPress={() => {
                    setYear(preset.evTol, preset.evIg);
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

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="Keresés"
        subtitle="Beállítások-stílus"
        rightLabel="Törlés"
        onRightPress={resetFilter}
      />
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Jármű</Text>
        <Group>
          <SettingsRow
            title="Márka"
            value={filter.gyartmany ?? "Mindegy"}
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
            value={filter.fuel ? fuelLabel(filter.fuel) : "Mindegy"}
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

        <Text style={styles.hint}>
          Márka / modell: almenü → választás → visszalépés. Extrák: kapcsoló.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
