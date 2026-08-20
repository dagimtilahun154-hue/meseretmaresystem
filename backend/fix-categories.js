const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check all distinct categories in field_job_materials
  const allMats = await prisma.fieldJobMaterial.findMany({
    select: { id: true, name: true, category: true, status: true },
    distinct: ['name']
  });
  console.log('All distinct material name/category pairs:');
  allMats.forEach(m => console.log(`  [${m.category}] ${m.name} (status: ${m.status})`));
  
  // Fix "Water Pump Model:" prefix in names
  const badNames = await prisma.fieldJobMaterial.findMany({
    where: { name: { startsWith: 'Water Pump Model:' } },
  });
  console.log(`\nFound ${badNames.length} records with "Water Pump Model:" prefix`);
  
  for (const mat of badNames) {
    const cleanName = mat.name.replace('Water Pump Model: ', '').replace('Water Pump Model:', '');
    await prisma.fieldJobMaterial.update({
      where: { id: mat.id },
      data: { 
        name: cleanName,
        category: 'PUMP',
      },
    });
    console.log(`  Fixed: "${mat.name}" -> "${cleanName}" (category: PUMP)`);
  }
  
  // Fix items that are Solar Panel / Controller / Submersible Cable but marked as WORK_TOOL
  const allMatsToFix = await prisma.fieldJobMaterial.findMany({
    where: { category: 'WORK_TOOL' },
  });
  
  let fixedCount = 0;
  for (const mat of allMatsToFix) {
    const name = (mat.name || '').toLowerCase();
    let newCat = null;
    
    if (name.includes('pump') && !name.includes('pipe') && !name.includes('cable') && !name.includes('fittings')) {
      newCat = 'PUMP';
    } else if (name.includes('solar panel') || name.includes('controller') || name.includes('inverter') || name.includes('submersible cable')) {
      newCat = 'PUMP_EQUIPMENT';
    }
    
    if (newCat) {
      await prisma.fieldJobMaterial.update({
        where: { id: mat.id },
        data: { category: newCat },
      });
      console.log(`  Recategorized: "${mat.name}" from WORK_TOOL -> ${newCat}`);
      fixedCount++;
    }
  }
  console.log(`\nFixed ${fixedCount} miscategorized WORK_TOOL records`);
  
  // Show final state
  console.log('\n--- Final state ---');
  const finalMats = await prisma.fieldJobMaterial.findMany({
    select: { name: true, category: true },
    distinct: ['name']
  });
  finalMats.forEach(m => console.log(`  [${m.category}] ${m.name}`));
}

main().catch(console.error).finally(() => prisma['$disconnect']());
