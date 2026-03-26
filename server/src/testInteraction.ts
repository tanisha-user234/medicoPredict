import { checkSafety } from './services/drugService';

const runTest = async () => {
  console.log("--- 🧪 TESTING DYNAMIC FDA ENGINE ---");

  // Scenario: 
  // User is already taking "Warfarin" (Blood thinner).
  // User tries to add "Aspirin".
  
  const currentMeds = ["Warfarin"];
  const newDrug = "Aspirin";

  console.log(`Current Meds: ${currentMeds}`);
  console.log(`Scanning New Drug: ${newDrug}...`);

  const alerts = await checkSafety(newDrug, currentMeds);

  if (alerts.length > 0) {
    console.log("\n❌ DANGER DETECTED:");
    alerts.forEach(a => console.log(a));
  } else {
    console.log("\n✅ No interactions found.");
  }
};

runTest();