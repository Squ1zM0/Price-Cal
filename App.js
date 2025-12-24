import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from "react-native";

const LOGO = require("./assets/accutrol_logo.jpeg");

const RATES = {
  residential: { x1: 125, x2: 175 },
  commercial: { x1: 150, x2: 200 },
};

const DEFAULT_TAX_PCT = "8.0";

function n(v) {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  const x = Math.round(n(v));
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pctLabel(p) {
  const sign = p > 0 ? "+" : "";
  return `${sign}${Math.round(p * 100)}%`;
}

function wiggleRandomPct() {
  // 5%–15%
  return 0.05 + Math.random() * 0.10;
}

export default function App() {
  const [materialInput, setMaterialInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");

  const [jobType, setJobType] = useState("residential"); // residential | commercial
  const [crew, setCrew] = useState("x1"); // x1 | x2

  const [taxIncluded, setTaxIncluded] = useState(true);
  const [taxRatePct, setTaxRatePct] = useState(DEFAULT_TAX_PCT);

  const [wiggleAppliedPct, setWiggleAppliedPct] = useState(null); // number (0.11) or (-0.07)
  const [showBreakdown, setShowBreakdown] = useState(false);

  const material = useMemo(() => n(materialInput), [materialInput]);
  const hours = useMemo(() => n(hoursInput), [hoursInput]);
  const taxRate = useMemo(() => n(taxRatePct) / 100, [taxRatePct]);

  const hourlyRate = RATES[jobType][crew];

  const breakdown = useMemo(() => {
    const matWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;
    const subtotal = matWithTax + labor;

    const afterOverhead = subtotal / 0.65;
    const afterWarranty = afterOverhead * 1.05;
    const final = afterWarranty * 1.1;

    return {
      matWithTax,
      labor,
      subtotal,
      afterOverhead,
      afterWarranty,
      final,
    };
  }, [material, taxIncluded, taxRate, hours, hourlyRate]);

  const basePrice = breakdown.final;

  const finalPrice = useMemo(() => {
    if (wiggleAppliedPct === null) return basePrice;
    return basePrice * (1 + wiggleAppliedPct);
  }, [basePrice, wiggleAppliedPct]);

  const canCalculate = useMemo(() => {
    return String(materialInput ?? "").trim().length > 0 || String(hoursInput ?? "").trim().length > 0;
  }, [materialInput, hoursInput]);

  function applyWiggle(direction) {
    const pct = wiggleRandomPct();
    setWiggleAppliedPct(direction === "up" ? pct : -pct);
  }

  function resetWiggle() {
    setWiggleAppliedPct(null);
  }

  function clearAll() {
    setMaterialInput("");
    setHoursInput("");
    setTaxIncluded(true);
    setTaxRatePct(DEFAULT_TAX_PCT);
    setJobType("residential");
    setCrew("x1");
    setWiggleAppliedPct(null);
    setShowBreakdown(false);
  }

  function copyPrice() {
    // Clipboard API differs between Expo versions; keep it simple and user-safe.
    Alert.alert("Price", `Final price: ${money(finalPrice)}\n\n(If you want, I can add a one-tap Copy button using expo-clipboard.)`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Job Price Calculator</Text>
            <Text style={styles.subtitle}>Fast HVAC quoting (material + labor → final)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1) Job Setup</Text>

          <Text style={styles.label}>Type</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="Residential"
              active={jobType === "residential"}
              onPress={() => setJobType("residential")}
            />
            <SegmentButton
              label="Commercial"
              active={jobType === "commercial"}
              onPress={() => setJobType("commercial")}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Crew</Text>
          <View style={styles.segmentRow}>
            <SegmentButton label="x1 Tech" active={crew === "x1"} onPress={() => setCrew("x1")} />
            <SegmentButton label="x2 Tech" active={crew === "x2"} onPress={() => setCrew("x2")} />
          </View>

          <View style={styles.pillRow}>
            <Pill label={`Rate`} value={`${money(hourlyRate)}/hr`} />
            <Pill label={`Overhead`} value={`÷ 0.65`} />
            <Pill label={`Warranty`} value={`+ 5%`} />
            <Pill label={`Offset`} value={`+ 10%`} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2) Inputs</Text>

          <Text style={styles.label}>Material</Text>
          <TextInput
            value={materialInput}
            onChangeText={setMaterialInput}
            placeholder="e.g. 450"
            keyboardType="decimal-pad"
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
                onChangeText={setTaxRatePct}
                placeholder={DEFAULT_TAX_PCT}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: 12 }]}>Hours</Text>
          <TextInput
            value={hoursInput}
            onChangeText={setHoursInput}
            placeholder="e.g. 2.5"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        <View style={[styles.card, styles.resultCard]}>
          <Text style={styles.cardTitle}>Final Price</Text>

          <Text style={styles.bigPrice}>{money(finalPrice)}</Text>

          {wiggleAppliedPct !== null ? (
            <Text style={styles.wiggleTag}>Wiggle applied: {pctLabel(wiggleAppliedPct)}</Text>
          ) : (
            <Text style={styles.hint}>Optional: tap wiggle up/down to nudge price 5–15%</Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => applyWiggle("down")}
              disabled={!canCalculate}
            >
              <Text style={styles.btnText}>⬇ Wiggle</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => applyWiggle("up")}
              disabled={!canCalculate}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>⬆ Wiggle</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={resetWiggle} disabled={wiggleAppliedPct === null}>
              <Text style={styles.btnText}>Reset</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={copyPrice}>
              <Text style={styles.btnText}>Details</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={clearAll}>
              <Text style={styles.btnText}>Clear</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setShowBreakdown((v) => !v)}
            style={styles.breakdownToggle}
          >
            <Text style={styles.breakdownToggleText}>{showBreakdown ? "Hide" : "Show"} breakdown</Text>
          </Pressable>

          {showBreakdown ? (
            <View style={styles.breakdown}>
              <Row label="Material (+ tax)" value={money(breakdown.matWithTax)} />
              <Row label="Labor" value={money(breakdown.labor)} />
              <Divider />
              <Row label="Subtotal" value={money(breakdown.subtotal)} />
              <Row label="After overhead (÷ 0.65)" value={money(breakdown.afterOverhead)} />
              <Row label="After warranty (+5%)" value={money(breakdown.afterWarranty)} />
              <Divider />
              <Row label="Base final (+10%)" value={money(basePrice)} />
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Tip: set your exact local tax rate once (toggle tax off), then leave it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, active ? styles.segmentBtnActive : null]}>
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Pill({ label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.breakRow}>
      <Text style={styles.breakLabel}>{label}</Text>
      <Text style={styles.breakValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },
  scroll: { padding: 16, paddingBottom: 28 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  title: { color: "#eaf0ff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { color: "#aab6d6", marginTop: 2, fontSize: 13 },

  card: {
    backgroundColor: "#101a33",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    ...Platform.select({ android: { elevation: 2 } }),
  },
  cardTitle: { color: "#eaf0ff", fontSize: 16, fontWeight: "800", marginBottom: 10 },

  label: { color: "#b9c4e6", fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.4 },
  labelInline: { color: "#b9c4e6", fontSize: 12, fontWeight: "700" },

  input: {
    backgroundColor: "#0c142a",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#eaf0ff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    fontSize: 16,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  segmentRow: { flexDirection: "row", gap: 10 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#0c142a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#1a2e66",
    borderColor: "rgba(255,255,255,0.18)",
  },
  segmentText: { color: "#c6d1ef", fontWeight: "800" },
  segmentTextActive: { color: "#ffffff" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pillLabel: { color: "#aab6d6", fontSize: 11, fontWeight: "800" },
  pillValue: { color: "#eaf0ff", fontSize: 12, fontWeight: "900" },

  resultCard: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0f1c3d",
  },
  bigPrice: {
    color: "#ffffff",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  hint: { color: "#aab6d6", marginTop: 6, fontSize: 12 },
  wiggleTag: { color: "#eaf0ff", marginTop: 6, fontSize: 12, fontWeight: "800" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  btnPrimary: { backgroundColor: "#2b5cff", borderColor: "rgba(255,255,255,0.18)" },
  btnSecondary: { backgroundColor: "rgba(255,255,255,0.06)" },
  btnGhost: { backgroundColor: "transparent" },
  btnText: { color: "#eaf0ff", fontWeight: "900" },
  btnTextPrimary: { color: "#ffffff" },

  breakdownToggle: { marginTop: 12, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 14 },
  breakdownToggleText: { color: "#b9c4e6", fontWeight: "800" },

  breakdown: { marginTop: 6, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 12 },
  breakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  breakLabel: { color: "#b9c4e6", fontSize: 12, fontWeight: "700", flex: 1, paddingRight: 10 },
  breakValue: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.10)", marginVertical: 8 },

  footer: { color: "#7f8bb1", fontSize: 12, marginTop: 6, textAlign: "center" },
});
