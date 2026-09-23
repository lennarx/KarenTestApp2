import { runSeed } from "../src/lib/seed";

runSeed()
  .then((r) => {
    console.log("Seed cargado:", r);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
