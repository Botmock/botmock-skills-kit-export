import "dotenv/config";
import fs from "fs";
import { basename, join } from "path";
import { getProjectData, mapProjectDataToInteractionModel } from "./lib";

export type ProjectResponse = {
  errors?: { error: string }[];
  data: any[];
};

const MIN_NODE_VERSION = 101600;
const numericalNodeVersion = parseInt(
  process.version
    .slice(1)
    .split(".")
    .map(seq => seq.padStart(2, "0"))
    .join(""),
  10
);

if (numericalNodeVersion < MIN_NODE_VERSION) {
  throw new Error("this script requires node.js version 10.16.0 or greater");
}

try {
  (async () => {
    const project: ProjectResponse = await getProjectData({
      projectId: process.env.BOTMOCK_PROJECT_ID,
      boardId: process.env.BOTMOCK_BOARD_ID,
      teamId: process.env.BOTMOCK_TEAM_ID,
      token: process.env.BOTMOCK_TOKEN,
    });
    for (const { error } of project.errors) {
      throw new Error(error);
    }
    const outputPath = join(__dirname, process.argv[2] || "output");
    // try to read from the output path; if possible, we do not need to create it
    try {
      await fs.promises.access(outputPath, fs.constants.R_OK);
    } catch (_) {
      await fs.promises.mkdir(outputPath);
    }
    const interactionModel = mapProjectDataToInteractionModel(project.data);
    const data = JSON.stringify({ interactionModel });
    const filePath = `${outputPath}/en-US.json`;
    await fs.promises.writeFile(filePath, data);
    const { size } = await fs.promises.stat(filePath);
    console.log(
      `Completed writing interaction model to /${basename(outputPath)} (${size /
        1000}kB)`
    );
  })();
} catch (err) {
  console.error(err);
  process.exit(1);
}
