import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import readline from "readline";

export const writeExcelCsv = async (
  data: { FileInd: string; Title: string; RawXML: string }[],
  outputDir: string = "./output"
) => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `travelport_profiles_${timestamp}.csv`;
  const filePath = path.resolve(outputDir, fileName);

  const csvHeader = "FileInd,Title,RawXML";
  const csvRows = data.map(
    (d) => `"${d.FileInd}","${d.Title}","${d.RawXML.replace(/"/g, '""')}"`
  );

  fs.writeFileSync(filePath, [csvHeader, ...csvRows].join("\n"), "utf-8");
  console.log("CSV saved at:", filePath);

  return filePath;
};

export const compressCsvFiles = async (outputDir: string = "./output") => {
  const zipPath = path.resolve(
    outputDir,
    `travelport_profiles_${Date.now()}.zip`
  );
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(outputDir, false);
  await archive.finalize();

  console.log("All CSVs compressed into:", zipPath);
  return zipPath;
};

export async function processCsvRecords(
  outputDir: string = "./output",
  token: string,
  onRecord: (record: {
    FileInd: string;
    Title: string;
    token: string;
  }) => Promise<void>
) {
  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".csv"));
  if (files.length === 0) {
    console.error("❌ No CSV files found in output directory.");
    return;
  }

  // Pick latest CSV file
  const latestFile = files.sort().reverse()[0];
  const filePath = path.join(outputDir, latestFile);
  console.log(`📂 Reading and processing: ${filePath}`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue; // skip header
    if (!line.trim()) continue;

    // Split safely by comma (basic CSV — assumes commas are not inside quotes)
    const [FileInd, Title] = line.split(",");

    const record = { FileInd, Title, token };
    await onRecord(record);
  }

  console.log(`✅ Processed ${lineCount - 1} records successfully.`);
}