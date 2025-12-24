import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";

const RATES = {
  residential: { x1: 125, x2: 175 },
  commercial: { x1: 150, x2: 200 },
};

function clampNumber(n) {
  if (Number.isNaN(n) || n === null || n === undefined) return 0;
  return n;
}

function roundToDollar(n) {
  return Math.round(n);
}

function formatMoney(n) {
  const v = clampNumber(n);
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function parseNumeric(text) {
  // allow digits and a single dot
  const cleaned = (text || "").replace(/[^0-9.]/g, "");
  // prevent multiple dots
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return parts[0] + "." + parts.slice(1).join("");
}

function TogglePill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
      accessibilityRole="button"
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function App() {
  const [materialInput, setMaterialInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");

  const [taxIncluded, setTaxIncluded] = useState(true);
  const [taxRatePct, setTaxRatePct] = useState("8.0"); // default; editable

  const [jobType, setJobType] = useState("residential"); // residential | commercial
  const [crew, setCrew] = useState("x1"); // x1 | x2

  const [wiggleAppliedPct, setWiggleAppliedPct] = useState(null); // number (e.g., 0.11 or -0.07)

  const material = useMemo(
    () => clampNumber(parseFloat(parseNumeric(materialInput))),
    [materialInput]
  );
  const hours = useMemo(() => clampNumber(parseFloat(parseNumeric(hoursInput))), [hoursInput]);
  const taxRate = useMemo(() => clampNumber(parseFloat(parseNumeric(taxRatePct))) / 100, [taxRatePct]);

  const hourlyRate = RATES[jobType][crew];

  const basePrice = useMemo(() => {
    const materialWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;

    const totalBeforeOverhead = materialWithTax + labor;
    const final = (totalBeforeOverhead / 0.65) * 1.05 * 1.1;

    return final;
  }, [material, taxIncluded, taxRate, hours, hourlyRate]);

  const finalPrice = useMemo(() => {
    if (wiggleAppliedPct === null) return basePrice;
    return basePrice * (1 + wiggleAppliedPct);
  }, [basePrice, wiggleAppliedPct]);

  const breakdown = useMemo(() => {
    const materialWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;
    const totalBeforeOverhead = materialWithTax + labor;
    const afterOverhead = totalBeforeOverhead / 0.65;
    const afterWarranty = afterOverhead * 1.05;
    const afterOffset = afterWarranty * 1.1;

    return {
      materialWithTax,
      labor,
      totalBeforeOverhead,
      afterOverhead,
      afterWarranty,
      afterOffset,
    };
  }, [material, taxIncluded, taxRate, hours, hourlyRate]);

  function applyWiggle(direction) {
    // random 5%–15%
    const pct = 0.05 + Math.random() * 0.1; // 0.05..0.15
    setWiggleAppliedPct(direction === "up" ? pct : -pct);
  }

  function resetWiggle() {
    setWiggleAppliedPct(null);
  }

  const wiggleLabel = useMemo(() => {
    if (wiggleAppliedPct === null) return "None";
    const sign = wiggleAppliedPct >= 0 ? "+" : "-";
    return `${sign}${Math.round(Math.abs(wiggleAppliedPct) * 100)}%`;
  }, [wiggleAppliedPct]);

  const canCompute = useMemo(() => {
    // allow 0 material and/or 0 hours, but warn if both empty
    return (materialInput || "").trim().length > 0 || (hoursInput || "").trim().length > 0;
  }, [materialInput, hoursInput]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>HVAC Price Calculator</Text>
        <Text style={styles.subtitle}>Fast job pricing with overhead + warranty + offset baked in.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Inputs</Text>

          <Text style={styles.label}>Material Cost</Text>
          <TextInput
            value={materialInput}
            onChangeText={(t) => setMaterialInput(parseNumeric(t))}
            placeholder="e.g. 450"
            keyboardType={Platform.select({ ios: "decimal-pad", android: "numeric" })}
            style={styles.input}
          />

          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Text style={styles.labelInline}>Tax already included</Text>
              <Switch value={taxIncluded} onValueChange={setTaxIncluded} />
            </View>
          </View>

          {!taxIncluded ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Tax Rate (%)</Text>
              <TextInput
                value={taxRatePct}
                onChangeText={(t) => setTaxRatePct(parseNumeric(t))}
                placeholder="8.0"
                keyboardType={Platform.select({ ios: "decimal-pad", android: "numeric" })}
                style={styles.input}
              />
              <Text style={styles.hint}>Used only when “Tax already included” is off.</Text>
            </View>
          ) : null}

          <Divider />

          <Text style={styles.label}>Hours</Text>
          <TextInput
            value={hoursInput}
            onChangeText={(t) => setHoursInput(parseNumeric(t))}
            placeholder="e.g. 3.5"
            keyboardType={Platform.select({ ios: "decimal-pad", android: "numeric" })}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Job Type</Text>
          <View style={styles.rowWrap}>
            <TogglePill
              label="Residential"
              active={jobType === "residential"}
              onPress={() => setJobType("residential")}
            />
            <TogglePill
              label="Commercial"
              active={jobType === "commercial"}
              onPress={() => setJobType("commercial")}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Crew</Text>
          <View style={styles.rowWrap}>
            <TogglePill label="x1 Tech" active={crew === "x1"} onPress={() => setCrew("x1")} />
            <TogglePill label="x2 Tech" active={crew === "x2"} onPress={() => setCrew("x2")} />
          </View>

          <Text style={styles.smallMeta}>
            Hourly rate: <Text style={styles.mono}>${hourlyRate}/hr</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Final</Text>
            <Text style={styles.priceValue}>{formatMoney(roundToDollar(finalPrice))}</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.smallMeta}>Wiggle applied: {wiggleLabel}</Text>
            <Pressable onPress={resetWiggle} style={styles.linkBtn}>
              <Text style={styles.linkText}>Reset</Text>
            </Pressable>
          </View>

          <View style={styles.wiggleRow}>
            <Pressable
              onPress={() => applyWiggle("down")}
              style={[styles.wiggleBtn, styles.wiggleDown]}
              disabled={!canCompute}
            >
              <Text style={styles.wiggleText}>▼ Wiggle Down</Text>
            </Pressable>
            <Pressable
              onPress={() => applyWiggle("up")}
              style={[styles.wiggleBtn, styles.wiggleUp]}
              disabled={!canCompute}
            >
              <Text style={styles.wiggleText}>▲ Wiggle Up</Text>
            </Pressable>
          </View>

          <Divider />

          <Text style={styles.sectionTitle}>Breakdown</Text>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Material (+tax)</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.materialWithTax)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Labor</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.labor)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Subtotal</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.totalBeforeOverhead)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>After overhead (/0.65)</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.afterOverhead)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>After warranty (+5%)</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.afterWarranty)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>After offset (+10%)</Text>
            <Text style={styles.breakVal}>{formatMoney(breakdown.afterOffset)}</Text>
          </View>

          <Text style={styles.hint}>
            Formula: (Material+Tax + Labor) / 0.65 × 1.05 × 1.10
          </Text>
        </View>

        <Text style={styles.footer}>
          Tip: If you want tax to always be added automatically, turn off “Tax already included” and set your local tax
          rate.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  subtitle: { marginTop: 6, opacity: 0.75 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  labelInline: { fontSize: 14, fontWeight: "600", marginRight: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#d8dbe2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fbfbfd",
  },
  hint: { marginTop: 8, fontSize: 12, opacity: 0.7 },

  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillInactive: { backgroundColor: "#ffffff", borderColor: "#d8dbe2" },
  pillText: { fontSize: 14, fontWeight: "700" },
  pillTextActive: { color: "#ffffff" },
  pillTextInactive: { color: "#111827" },

  divider: { height: 1, backgroundColor: "#eef0f4", marginVertical: 14 },

  smallMeta: { marginTop: 10, fontSize: 13, opacity: 0.8 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  priceLabel: { fontSize: 16, fontWeight: "800" },
  priceValue: { fontSize: 28, fontWeight: "900" },

  wiggleRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  wiggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  wiggleUp: { backgroundColor: "#111827" },
  wiggleDown: { backgroundColor: "#374151" },
  wiggleText: { color: "#fff", fontWeight: "800" },

  linkBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  linkText: { fontWeight: "800", opacity: 0.85 },

  breakRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  breakLabel: { opacity: 0.75 },
  breakVal: { fontWeight: "700" },

  footer: { marginTop: 14, fontSize: 12, opacity: 0.7 },
});
