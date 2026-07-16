import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

export async function waitForUserReady(message) {
  console.log("");
  console.log(message);
  console.log("");

  const rl = createInterface({ input, output });
  await rl.question("Ha kész, nyomj ENTER-t... ");
  rl.close();
}
