const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const records = await p.pumpProduct.findMany();
  console.log("Total pump products:", records.length);
  records.forEach((x) => console.log(x.id, "|", x.model, "|", x.brand, "|", x.firstCategory));
  await p["$disconnect"]();
}
main();
