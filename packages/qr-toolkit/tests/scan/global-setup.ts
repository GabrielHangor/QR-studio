import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default async function setup() {
  // A fixed ignored output directory; never delete caller-supplied paths.
  const directory = fileURLToPath(new URL("../../test-results/scan/", import.meta.url));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const manifest = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );
  await writeFile(
    new URL("../../test-results/scan/environment.json", import.meta.url),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        dependencies: manifest.dependencies,
        devDependencies: manifest.devDependencies,
      },
      null,
      2,
    ),
  );
}
