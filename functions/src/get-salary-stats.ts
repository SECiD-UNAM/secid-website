import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Privacy: minimum data points per group
const MIN_GROUP_SIZE = 3;

interface SalaryDataPoint {
  monthlyGross: number;
  currency: string;
  country: string;
  fiscalRegime: string;
  experienceLevel: string;
  industry: string;
  benefits: string[];
  annualBonus: number;
  annualBonusType: string;
  stockAnnualValue: number;
  signOnBonus: number;
  // Admin only
  memberName?: string;
  memberEmail?: string;
  company?: string;
  position?: string;
  current?: boolean;
}

function safeAggregate(values: number[]) {
  if (values.length < MIN_GROUP_SIZE) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    median: sorted[Math.floor(n / 2)]!,
    p10: sorted[Math.floor(n * 0.1)]!,
    p25: sorted[Math.floor(n * 0.25)]!,
    p75: sorted[Math.floor(n * 0.75)]!,
    p90: sorted[Math.floor(n * 0.9)]!,
    count: n,
  };
}

function buildHistogram(values: number[], binCount = 12) {
  if (values.length < MIN_GROUP_SIZE) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  if (min === max) return [{ rangeMin: min, rangeMax: max, count: values.length }];
  const binWidth = (max - min) / binCount;
  return Array.from({ length: binCount }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const count = values.filter((v) =>
      i === binCount - 1 ? v >= lo && v <= hi : v >= lo && v < hi
    ).length;
    return { rangeMin: lo, rangeMax: hi, count };
  });
}

export const getSalaryStats = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const callerUid = request.auth.uid;

    // Get caller's user doc for role check
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();
    const callerRole = callerData?.role || "member";
    const isAdmin = callerRole === "admin"; // Only admin gets raw data, NOT moderator
    const isVerified = callerData?.isVerified === true || isAdmin || callerRole === "moderator";

    if (!isVerified) {
      return {
        tier: "public",
        overview: null,
        distribution: null,
        byExperience: null,
        byIndustry: null,
        benefits: null,
        breakdown: null,
        rawData: null,
      };
    }

    // Check if caller has contributed
    const callerCompSnap = await db
      .collection("users")
      .doc(callerUid)
      .collection("compensation")
      .limit(1)
      .get();
    const isContributor = !callerCompSnap.empty;

    const tier = isAdmin ? "admin" : isContributor ? "contributor" : "member";

    // Read ALL compensation docs via collectionGroup
    const compSnap = await db.collectionGroup("compensation").get();

    if (compSnap.empty) {
      return {
        tier,
        overview: null,
        distribution: null,
        byExperience: null,
        byIndustry: null,
        benefits: null,
        breakdown: null,
        rawData: null,
      };
    }

    // Extract userId from each doc path: users/{userId}/compensation/{entryId}
    const compDocs = compSnap.docs.map((doc) => {
      const pathParts = doc.ref.path.split("/");
      const userId = pathParts[1]!;
      return { userId, data: doc.data(), roleId: doc.id };
    });

    // Batch-read unique user docs (Firestore getAll limit: 10 at a time)
    const uniqueUserIds = [...new Set(compDocs.map((d) => d.userId))];
    const userDocs = new Map<string, FirebaseFirestore.DocumentData>();
    for (let i = 0; i < uniqueUserIds.length; i += 10) {
      const batch = uniqueUserIds.slice(i, i + 10);
      const refs = batch.map((uid) => db.collection("users").doc(uid));
      const results = await db.getAll(...refs);
      results.forEach((doc) => {
        if (doc.exists) userDocs.set(doc.id, doc.data()!);
      });
    }

    // Read all companies for industry mapping
    const companiesSnap = await db.collection("companies").get();
    const companyMap = new Map<string, { name: string; industry: string }>();
    companiesSnap.docs.forEach((doc) => {
      const d = doc.data();
      companyMap.set(doc.id, { name: d.name || "", industry: d.industry || "Otros" });
    });

    // Build data points
    const dataPoints: SalaryDataPoint[] = [];
    const contributorUids = new Set<string>();

    for (const { userId, data, roleId } of compDocs) {
      if (!data.monthlyGross) continue;

      const userData = userDocs.get(userId);
      if (!userData) continue;

      const level = userData.experience?.level || "mid";

      // Find the matching role in work history for company/position info
      const roles = userData.experience?.previousRoles || [];
      const matchingRole = roles.find((r: { id?: string }) => r.id === roleId);
      const companyId = matchingRole?.companyId || userData.profile?.companyId;
      const company = companyId ? companyMap.get(companyId) : null;

      contributorUids.add(userId);

      dataPoints.push({
        monthlyGross: data.monthlyGross,
        currency: data.currency || "MXN",
        country: data.country || "MX",
        fiscalRegime: data.fiscalRegime || "asalariado",
        experienceLevel: level,
        industry: company?.industry || "Otros",
        benefits: data.benefits || [],
        annualBonus: data.annualBonus || 0,
        annualBonusType: data.annualBonusType || "fixed",
        stockAnnualValue: data.stockAnnualValue || 0,
        signOnBonus: data.signOnBonus || 0,
        // PII only populated for admin tier — minimizes in-memory exposure
        ...(isAdmin
          ? {
              memberName:
                userData.displayName ||
                `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
                "Unknown",
              memberEmail: userData.email || "",
              company: matchingRole?.company || company?.name || "-",
              position:
                matchingRole?.position ||
                userData.experience?.currentRole ||
                "-",
              current: matchingRole?.current || false,
            }
          : {}),
      });
    }

    if (dataPoints.length === 0) {
      return {
        tier,
        overview: null,
        distribution: null,
        byExperience: null,
        byIndustry: null,
        benefits: null,
        breakdown: null,
        rawData: null,
      };
    }

    // --- Compute aggregates ---
    const grossValues = dataPoints.map((d) => d.monthlyGross);
    const overallStats = safeAggregate(grossValues);

    // Overview (always for members+)
    const overview = overallStats
      ? {
          medianMonthlyGross: overallStats.median,
          medianTotalComp:
            safeAggregate(
              dataPoints.map((d) => {
                const annual = d.monthlyGross * 12;
                const bonus =
                  d.annualBonusType === "percentage"
                    ? annual * (d.annualBonus / 100)
                    : d.annualBonus;
                return annual + bonus + d.stockAnnualValue + d.signOnBonus;
              })
            )?.median || overallStats.median * 12,
          dataPointCount: dataPoints.length,
          contributorCount: contributorUids.size,
        }
      : null;

    // Distribution histogram (always for members+)
    const distribution = buildHistogram(grossValues);

    // By experience level (always for members+)
    const experienceLevels = ["junior", "mid", "senior", "lead", "executive"];
    const byExperience = experienceLevels
      .map((level) => {
        const values = dataPoints
          .filter((d) => d.experienceLevel === level)
          .map((d) => d.monthlyGross);
        const stats = safeAggregate(values);
        if (!stats) return null;
        return { level, ...stats };
      })
      .filter(Boolean);

    // By industry (contributor+ only)
    let byIndustry = null;
    if (tier === "contributor" || tier === "admin") {
      const industryMap = new Map<string, number[]>();
      dataPoints.forEach((d) => {
        if (!industryMap.has(d.industry)) industryMap.set(d.industry, []);
        industryMap.get(d.industry)!.push(d.monthlyGross);
      });
      byIndustry = Array.from(industryMap.entries())
        .map(([industry, values]) => {
          const stats = safeAggregate(values);
          if (!stats) return null;
          return { industry, ...stats };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.median - a.median);
    }

    // Benefits frequency (contributor+ only)
    let benefits = null;
    if (tier === "contributor" || tier === "admin") {
      const benefitCounts = new Map<string, number>();
      dataPoints.forEach((d) => {
        d.benefits.forEach((b) => {
          benefitCounts.set(b, (benefitCounts.get(b) || 0) + 1);
        });
      });
      benefits = Array.from(benefitCounts.entries())
        .filter(([, count]) => count >= MIN_GROUP_SIZE) // Privacy: suppress rare benefits
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / dataPoints.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    }

    // Compensation breakdown (contributor+ only)
    let breakdown = null;
    if (tier === "contributor" || tier === "admin") {
      let totalBase = 0;
      let totalBonus = 0;
      let totalStock = 0;
      let totalSignOn = 0;
      dataPoints.forEach((d) => {
        const annual = d.monthlyGross * 12;
        totalBase += annual;
        totalBonus +=
          d.annualBonusType === "percentage"
            ? annual * (d.annualBonus / 100)
            : d.annualBonus;
        totalStock += d.stockAnnualValue;
        totalSignOn += d.signOnBonus;
      });
      const total = totalBase + totalBonus + totalStock + totalSignOn;
      if (total > 0 && dataPoints.length >= MIN_GROUP_SIZE) {
        breakdown = {
          base: Math.round((totalBase / total) * 100),
          bonus: Math.round((totalBonus / total) * 100),
          stock: Math.round((totalStock / total) * 100),
          signOn: Math.round((totalSignOn / total) * 100),
        };
      }
    }

    // Raw data (admin only)
    let rawData = null;
    if (tier === "admin") {
      rawData = dataPoints.map((d) => ({
        memberName: d.memberName,
        memberEmail: d.memberEmail,
        company: d.company,
        position: d.position,
        current: d.current,
        industry: d.industry,
        country: d.country,
        currency: d.currency,
        fiscalRegime: d.fiscalRegime,
        monthlyGross: d.monthlyGross,
        annualBonus: d.annualBonus,
        stockValue: d.stockAnnualValue,
        benefits: d.benefits,
      }));
    }

    return {
      tier,
      overview,
      distribution,
      byExperience: byExperience.length > 0 ? byExperience : null,
      byIndustry,
      benefits,
      breakdown,
      rawData,
    };
  }
);
