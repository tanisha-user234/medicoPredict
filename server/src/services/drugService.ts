import axios from 'axios';

// --- 1. DATA STRUCTURES ---
interface DrugData {
  brandName: string;
  genericName: string;
  drugClasses: string[];
  sections: {
    boxed_warning: string[];      // Weight: 10
    contraindications: string[];  // Weight: 9
    warnings: string[];           // Weight: 6
    interactions: string[];       // Weight: 3
  };
}

interface RiskResult {
  score: number;       // 0-10
  level: string;       // "CRITICAL", "HIGH"
  reason: string;      // The exact sentence from the FDA
}

const OPEN_FDA_URL = "https://api.fda.gov/drug/label.json";

// --- 2. THE SMART SNIPPET EXTRACTOR (Final Polish) ---
const findRelevantSentence = (fullText: string, searchTerm: string): string => {
  if (!fullText || !searchTerm) return "Details not available.";

  const lowerText = fullText.toLowerCase();
  const index = lowerText.indexOf(searchTerm);

  if (index === -1) return "Mentioned in this section.";

  // 1. Find Start (Look backward for punctuation)
  const lookBackText = fullText.substring(0, index);
  const lastBreakMatch = lookBackText.match(/(\.|!|\?|\n|•)\s+/g);
  
  let start = 0;
  if (lastBreakMatch && lastBreakMatch.length > 0) {
      const lastToken = lastBreakMatch[lastBreakMatch.length - 1];
      start = lookBackText.lastIndexOf(lastToken) + lastToken.length;
  } else {
      start = Math.max(0, index - 50);
  }

  // 2. Find End (Look forward)
  const lookAheadText = fullText.substring(index);
  const nextBreakMatch = lookAheadText.search(/(\.|!|\?|\n|•)/);
  const end = nextBreakMatch > -1 ? (index + nextBreakMatch + 1) : Math.min(fullText.length, index + 150);

  // 3. CLEAN UP THE UGLY PARTS
  let snippet = fullText.substring(start, end).trim();

  // A. Remove Table Headers (The magic fix)
  snippet = snippet.replace(/Table \d+:/gi, ""); 
  snippet = snippet.replace(/Drug Class/gi, ""); 
  snippet = snippet.replace(/Specific Drugs/gi, ""); 
  snippet = snippet.replace(/System Organ Class/gi, "");

  // B. Remove leading punctuation/bullets
  snippet = snippet.replace(/^[:\-\•\s]+/, ""); 
  
  // C. Collapse multiple spaces into one
  snippet = snippet.replace(/\s\s+/g, " ");

  if (snippet.length > 200) {
    return snippet.substring(0, 197) + "...";
  }

  return snippet;
};

// --- 3. FETCH DATA ---
export const getDrugDetails = async (drugName: string): Promise<DrugData | null> => {
  try {
    const response = await axios.get(OPEN_FDA_URL, {
      params: {
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: 1
      }
    });

    if (!response.data.results || response.data.results.length === 0) return null;
    const data = response.data.results[0];
    const classes = data.openfda?.pharm_class_epc || [];

    return {
      brandName: data.openfda?.brand_name ? data.openfda.brand_name[0] : drugName,
      genericName: data.openfda?.generic_name ? data.openfda.generic_name[0] : "",
      drugClasses: classes.map((c: string) => c.toLowerCase()),
      sections: {
        boxed_warning: data.boxed_warning || [],
        contraindications: data.contraindications || [],
        warnings: data.warnings || [],
        interactions: data.drug_interactions || []
      }
    };
  } catch (error) {
    console.error(`❌ Error fetching details for ${drugName}`);
    return null;
  }
};

// --- 4. THE ANALYZER ---
// --- 4. THE ANALYZER (Fixed for TypeScript) ---
const analyzeRisk = (targetDrug: DrugData, searchTerms: string[]): RiskResult | null => {
  let bestMatch: RiskResult | null = null;

  // We define the sections and iterate through them explicitly.
  // This avoids the "closure" error that was confusing TypeScript.
  const sectionsToCheck = [
    { data: targetDrug.sections.boxed_warning, score: 10, level: "CRITICAL (Boxed Warning)" },
    { data: targetDrug.sections.contraindications, score: 9, level: "SEVERE (Contraindicated)" },
    { data: targetDrug.sections.warnings, score: 6, level: "MODERATE (Warning)" },
    { data: targetDrug.sections.interactions, score: 3, level: "MINOR (Interaction)" }
  ];

  // Loop through sections (Highest Risk First)
  for (const section of sectionsToCheck) {
    // Optimization: If we found a match in a high-priority section (e.g., Boxed Warning),
    // we don't need to check lower ones. We found the worst-case scenario.
    if (bestMatch) break;

    const fullText = section.data.join(" ").toLowerCase();
    const originalText = section.data.join(" ");

    for (const term of searchTerms) {
      if (!term) continue;

      if (fullText.includes(term)) {
        // Found a hit! Extract the sentence.
        const exactReason = findRelevantSentence(originalText, term);
        
        bestMatch = {
          score: section.score,
          level: section.level,
          reason: exactReason
        };
        break; // Stop checking other terms for this section
      }
    }
  }

  // --- KEYWORD BOOST ---
  // Now TypeScript knows 'bestMatch' is definitely RiskResult | null
  if (bestMatch) {
    const text = bestMatch.reason.toLowerCase();
    
    if (text.match(/bleed|hemorrhage|fatal|death|stroke|failure|heart attack|seizure/i)) {
      if (bestMatch.score < 8) {
        bestMatch.score = 8;
        bestMatch.level = "HIGH (Risk of Severe Side Effects)";
      }
    }
  }

  return bestMatch;
};
// --- 5. MAIN EXPORT ---
export const checkSafety = async (newDrugName: string, currentDrugs: string[]): Promise<any[]> => {
  const warnings: any[] = [];
  const newDrug = await getDrugDetails(newDrugName);
  
  if (!newDrug) return [{ error: `Could not find data for ${newDrugName}` }];

  console.log(`\n🔎 Analyzing: ${newDrug.brandName}...`);

  for (const existingDrugName of currentDrugs) {
    const existingDrug = await getDrugDetails(existingDrugName);
    if (!existingDrug) continue;

    const newDrugTerms = [newDrug.brandName, newDrug.genericName, ...newDrug.drugClasses].map(t => t.toLowerCase());
    const oldDrugTerms = [existingDrug.brandName, existingDrug.genericName, ...existingDrug.drugClasses].map(t => t.toLowerCase());

    // Check 1
    let risk = analyzeRisk(existingDrug, newDrugTerms);
    if (risk) {
      warnings.push({
        drugPair: `${existingDrug.brandName} + ${newDrug.brandName}`,
        severity: risk.level,
        score: risk.score,
        reason: risk.reason
      });
    }

    // Check 2
    if (!risk || risk.score < 10) {
      let reverseRisk = analyzeRisk(newDrug, oldDrugTerms);
      if (reverseRisk) {
        warnings.push({
          drugPair: `${newDrug.brandName} + ${existingDrug.brandName}`,
          severity: reverseRisk.level,
          score: reverseRisk.score,
          reason: reverseRisk.reason
        });
      }
    }
  }

  return warnings;
};